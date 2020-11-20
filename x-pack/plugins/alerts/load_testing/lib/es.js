/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** @typedef { import('./types').EventLogRecord } EventLogRecord */

const https = require('https');
const querystring = require('querystring');
const axios = require('axios').default;
const logger = require('./logger');
const { retry } = require('./utils');

module.exports = {
  getEventLog,
  getEsStatus,
};

const RETRY_SECONDS = 5;
const RETRY_ATTEMPTS = 120;
const BATCH_SIZE = 1000;

const axiosConfig = {
  headers: {
    'content-type': 'application/json',
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
};

const httpClient = axios.create(axiosConfig);

/** @type { (scenario: string, esUrl: string, batchSize: number) => Promise<EventLogRecord[]> } */
async function getEventLog(scenario, esUrl, batchSize = BATCH_SIZE) {
  const docs = await retry(
    RETRY_ATTEMPTS,
    RETRY_SECONDS,
    `getting event log for ${scenario}`,
    async () => await getEventLogScrolled(esUrl, batchSize)
  );

  return docs.map((doc) => {
    const _source = doc._source || {};
    const event = _source.event || {};
    const kibana = _source.kibana || {};
    const savedObjects = kibana.saved_objects || [];

    let alert;
    let action;
    for (const { type, id } of savedObjects) {
      if (type === 'alert') alert = { alert: `${id}` };
      if (type === 'action') action = { action: `${id}` };
    }

    return {
      scenario,
      provider: event.provider || 'unknown',
      date: event.start || new Date().toISOString(),
      duration: Math.round((event.duration || 0) / 1000 / 1000),
      outcome: event.outcome,
      ...alert,
      ...action,
    };
  });
}

/** @type { (esUrl: string) => Promise<any[]> } */
async function getEsStatus(esUrl) {
  const response = await retry(
    10,
    2,
    `getting elasticsearch status`,
    async () => await httpClient.get(`${esUrl}/_cat/nodes?format=json`)
  );
  return response.data || [];
}

/** @type { (esUrl: string, batchSize: number) => Promise<any[]> } */
async function getEventLogScrolled(esUrl, batchSize) {
  const q = 'event.action:execute';
  const scroll = '10m';

  /** @type { any } */
  let qs = {
    size: `${batchSize}`,
    sort: '@timestamp',
    scroll,
    q,
  };

  logger.debug(`es.getEventLogScrolled: getting first batch of ${batchSize}`);
  let uri = `.kibana-event-log-*/_search?${querystring.stringify(qs)}`;
  let response = await httpClient.get(`${esUrl}/${uri}`);

  /** @type { any[] } */
  let hits = response.data.hits.hits;
  let docs = hits;
  let scrollId = response.data._scroll_id;

  while (scrollId && hits.length !== 0) {
    logger.debug(`es.getEventLogScrolled: getting next batch of ${batchSize}`);
    qs = {
      scroll,
      scroll_id: scrollId,
    };
    uri = `_search/scroll?${querystring.stringify(qs)}`;

    response = await httpClient.get(`${esUrl}/${uri}`);

    hits = response.data.hits.hits;
    docs = docs.concat(hits);
    scrollId = response.data._scroll_id;
  }

  logger.debug(`es.getEventLogScrolled: got ${docs.length} docs`);
  return docs;
}

// @ts-ignore
if (require.main === module) test();

async function test() {
  logger.printTime(true);
  const url = process.argv[2];
  if (url == null) logger.logErrorAndExit('expecting es url argument');
  try {
    const result = await getEventLog('test', url, 10000);
    console.log(JSON.stringify(result, null, 4));
  } catch (err) {
    console.log('error:', err.message, err.response.data);
  }
}
