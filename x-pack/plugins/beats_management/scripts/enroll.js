/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
const request = require('request');
const Chance = require('chance'); // eslint-disable-line
const args = process.argv.slice(2);
const chance = new Chance();

const enroll = async (kibanaURL, token) => {
  const beatId = chance.word();

  if (!token) {
    token = kibanaURL;
    kibanaURL = 'http://localhost:5601';
  }

  await request(
    {
      url: `${kibanaURL}/api/beats/agent/${beatId}`,
      method: 'POST',
      headers: {
        'kbn-xsrf': 'xxx',
        'kbn-beats-enrollment-token': token,
      },
      body: JSON.stringify({
        type: 'filebeat',
        host_name: `${chance.word()}.bar.com`,
        name: chance.word(),
        version: '6.3.0',
      }),
    },
    (error, response, body) => {
      console.log(error, body);
    }
  );
};

enroll(...args);
