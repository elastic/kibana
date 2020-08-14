/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

/* eslint-disable import/no-extraneous-dependencies */

/**
 * This script is useful for ingesting previously generated APM data into Elasticsearch via APM Server
 *
 * You can either:
 *  1. Download a static test data file from: https://storage.googleapis.com/apm-ui-e2e-static-data/events.json
 *  2. Or, generate the test data file yourself:
 *    git clone https://github.com/elastic/apm-integration-testing.git
 *    ./scripts/compose.py start master --no-kibana --with-opbeans-node --apm-server-record
 *    docker cp localtesting_8.0.0_apm-server-2:/app/events.json . && cat events.json | wc -l
 *
 *
 *
 * Run the script:
 *
 *  node replay.js --server-url <apm server url> --secret-token <apm server secret token> --events ./events.json
 *
 ************/

const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const readFile = promisify(fs.readFile);
const pLimit = require('p-limit');
const pRetry = require('p-retry');
const { argv } = require('yargs');
const ora = require('ora');
const userAgents = require('./user_agents');
const userIps = require('./rum_ips');

const APM_SERVER_URL = argv.serverUrl;
const SECRET_TOKEN = argv.secretToken;
const EVENTS_PATH = argv.events;

if (!APM_SERVER_URL) {
  console.log('`--server-url` is required');
  process.exit(1);
}

if (!EVENTS_PATH) {
  console.log('`--events` is required');
  process.exit(1);
}

const requestProgress = {
  succeeded: 0,
  failed: 0,
  total: 0,
};

const spinner = ora({ text: 'Warming up...', stream: process.stdout });

function incrementSpinnerCount({ success }) {
  success ? requestProgress.succeeded++ : requestProgress.failed++;
  const remaining =
    requestProgress.total -
    (requestProgress.succeeded + requestProgress.failed);

  spinner.text = `Remaining: ${remaining}. Succeeded: ${requestProgress.succeeded}. Failed: ${requestProgress.failed}.`;
}
let iterIndex = 0;

function setRumAgent(item) {
  item.body = item.body.replace(
    '"name":"client"',
    '"name":"opbean-client-rum"'
  );
}

async function insertItem(item) {
  try {
    const url = `${APM_SERVER_URL}${item.url}`;
    const headers = {
      'content-type': 'application/x-ndjson',
    };

    if (item.url === '/intake/v2/rum/events') {
      if (iterIndex === userAgents.length) {
        // set some event agent to opbean
        setRumAgent(item);
        iterIndex = 0;
      }
      headers['User-Agent'] = userAgents[iterIndex];
      headers['X-Forwarded-For'] = userIps[iterIndex];
      iterIndex++;
    }

    if (SECRET_TOKEN) {
      headers.Authorization = `Bearer ${SECRET_TOKEN}`;
    }

    await axios({
      method: item.method,
      url,
      headers,
      data: item.body,
    });
  } catch (e) {
    console.error(
      `${e.response ? JSON.stringify(e.response.data) : e.message}`
    );
    throw e;
  }
}

async function init() {
  const content = await readFile(path.resolve(EVENTS_PATH));
  const items = content
    .toString()
    .split('\n')
    .filter((item) => item)
    .map((item) => JSON.parse(item))
    .filter((item) => {
      return (
        item.url === '/intake/v2/events' || item.url === '/intake/v2/rum/events'
      );
    });

  spinner.start();
  requestProgress.total = items.length;

  const limit = pLimit(20); // number of concurrent requests
  await Promise.all(
    items.map(async (item) => {
      try {
        // retry 5 times with exponential backoff
        await pRetry(() => limit(() => insertItem(item)), {
          retries: 5,
        });
        incrementSpinnerCount({ success: true });
      } catch (e) {
        incrementSpinnerCount({ success: false });
      }
    })
  );
}

init()
  .then(() => {
    if (requestProgress.succeeded === requestProgress.total) {
      spinner.succeed(
        `Successfully ingested ${requestProgress.succeeded} of ${requestProgress.total} events`
      );
      process.exit(0);
    } else {
      spinner.fail(
        `Ingested ${requestProgress.succeeded} of ${requestProgress.total} events`
      );
      process.exit(1);
    }
  })
  .catch((e) => {
    console.log('An error occurred:', e);
    process.exit(1);
  });
