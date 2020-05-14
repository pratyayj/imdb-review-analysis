/**
 * This simple function uses a model trained on 100 positive and negative IMDB reviews each.
 * It returns a score for the likelihood of the sent review to be positive or negative.
 * Data is sent via json with the format {"text": <TEXT>} via a HTTP post request.
 * ExpressJS req and res is utilized.
 */
exports.analyzeReviewSentiment = (req, res) => {
  //const dotenv = require('dotenv');
  //dotenv.config();

  const projectId = process.env.PROJECT_ID;
  const location = process.env.LOCATION;
  const modelId = process.env.MODEL_ID;
  const topicName = process.env.TOPIC_NAME;

  const {PredictionServiceClient} = require('@google-cloud/automl').v1;
  const {PubSub} = require('@google-cloud/pubsub')
  const options={
    keyFilename:process.env.KEY_FILENAME
  };

  const client = new PredictionServiceClient(options);
  const pubSubClient = new PubSub();

  let analysisText = req.body.text;

  async function predictAndRecord() {
    let testRequest = {
      name: client.modelPath(projectId, location, modelId),
      payload: {
        textSnippet: {
          content: analysisText,
          mime_type: "text_plain",
        },
      },
    };

    let jsonResponse = {
      "positive_score": '',
      "negative_score": '',
    }

    let pubSubMessage = {
      "ipAddress": req.ip,
      "datetime": new Date()
    }

    console.log(pubSubMessage);
    const data = JSON.stringify(pubSubMessage);
    const dataBuffer = Buffer.from(data);

    const [response] = await client.predict(testRequest);
    for (const annotationPayload of response.payload) {
      if (annotationPayload.displayName === 'positive') {
        jsonResponse.positive_score = annotationPayload.classification.score;
      } else {
        jsonResponse.negative_score = annotationPayload.classification.score;
      }

      // console.log(`Predicted class name: ${annotationPayload.displayName}`);
      // console.log(`Predicted class score: ${annotationPayload.classification.score}`);
    }
    const messageId = await pubSubClient.topic(topicName).publish(dataBuffer);
    res.send(jsonResponse);
  }

  predictAndRecord();
};
