/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const https = require('https');
const axios = require('axios').default;
const pkg = require('../package.json');
const { retry } = require('./utils');

module.exports = {
  createAlert,
  getKbStatus,
};

const alertTypeId = '.index-threshold';

const axiosConfig = {
  headers: {
    'kbn-xsrf': `${pkg.name}@${pkg.version}`,
    'content-type': 'application/json',
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
};

const httpClient = axios.create(axiosConfig);

/** @type { (kbUrl: string, name: string, inputIndex: string) => Promise<string> } */
async function createAlert(kbUrl, name) {
  /** @type {any} */
  const data = {
    enabled: true,
    name,
    alertTypeId,
    consumer: 'alerts',
    schedule: { interval: '1m' },
    actions: [
      // TODO: add a server log action, to generate more tasks
    ],
    params: {
      index: '.kibana-event-log*',
      timeField: '@timestamp',
      aggType: 'avg',
      aggField: 'event.duration',
      groupBy: 'top',
      termField: 'event.action',
      termSize: 10,
      timeWindowSize: '1',
      timeWindowUnit: 'm',
      thresholdComparator: '<',
      threshold: [0],
    },
  };

  const response = await retry(
    120,
    5,
    `creating alert`,
    async () => await httpClient.post(`${kbUrl}/api/alerts/alert`, data)
  );

  const { id } = response.data || {};
  return id;
}

/** @type { (kbUrl: string) => Promise<any> } */
async function getKbStatus(kbUrl) {
  const response = await retry(
    10,
    2,
    `getting kibana status`,
    async () => await httpClient.get(`${kbUrl}/api/status`)
  );
  return response.data || {};
}

// @ts-ignore
if (require.main === module) test();

async function test() {
  const url = 'https://elastic:changeme@localhost:5601';
  const name = __filename;
  try {
    const id = await createAlert(url, name);
    console.log(`created alert:`, id);
  } catch (err) {
    const { status, statusText, data } = err.response;
    console.log('error:', status, statusText);
    console.log(JSON.stringify(data, null, 4));
  }
}
