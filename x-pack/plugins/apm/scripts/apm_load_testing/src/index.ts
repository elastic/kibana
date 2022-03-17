/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

// eslint-disable-next-line import/no-extraneous-dependencies
import 'dotenv/config';
import pRetry from 'p-retry';
import puppeteer from 'puppeteer';
import axios from 'axios';
import { groupBy, meanBy, range } from 'lodash';

const APM_URL = process.env.APM_URL as string;
const USERNAME = process.env.USERNAME as string;
const PASSWORD = process.env.PASSWORD as string;
const ES_HOST = process.env.ES_HOST as string;
const NUMBER_OF_RUNS = parseInt(process.env.NUMBER_OF_RUNS as string, 10);

const apmRequestsTimingsList: ApmRequestTimings = [];

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log(`Opening ${APM_URL}`);
    await page.goto(APM_URL, { waitUntil: 'networkidle0' });

    // authenticate (basic auth doesnt work)
    // await page.authenticate({ username: USERNAME, password: PASSWORD });
    await page.type('input[name=username]', USERNAME);
    await page.type('input[name=password]', PASSWORD);

    // click submit and block until page has change
    await Promise.all([
      page.waitForNavigation(),
      await page.click('button[type="submit"]'),
    ]);

    const iterations = range(0, NUMBER_OF_RUNS);
    for (const count of iterations) {
      // clear cache
      await clearElasticsearchCache();

      const retryOptions = {
        retries: 6,
        onFailedAttempt: (error: pRetry.FailedAttemptError) => {
          console.log(
            `Failed to open page: "${error.message}". ${error.retriesLeft} retries left.`
          );
        },
      };

      console.log(`Starting iteration: ${count}`);
      await pRetry(() => openPage(page), retryOptions);
    }

    console.log(getAverageRequestTimings());

    console.log('Finished');
    await browser.close();
  } catch (e) {
    console.log('Unhandled error occurred');
    await page.screenshot({
      path: `screenshots/${Date.now()}-exception.png`,
      fullPage: true,
    });
    throw e;
  }
})();

async function openPage(page: puppeteer.Page): Promise<void> {
  // debugOutput(page);

  // open page
  await Promise.all([
    waitForApmRequests(page),
    await page.goto(APM_URL, { waitUntil: 'networkidle0' }),
  ]);

  const apmRequestsTimings = await getApmRequestTimings(page);
  apmRequestsTimingsList.push(...apmRequestsTimings);
}

function waitForApmRequests(page: puppeteer.Page) {
  return page.waitForResponse((response) => {
    return (
      response.url().includes('/internal/apm') ||
      response.url().includes('/api/apm')
    );
  });
}

async function clearElasticsearchCache() {
  try {
    await axios({
      method: 'POST',
      url: `${ES_HOST}/_cache/clear`,
      auth: { username: 'kibana_system_user', password: PASSWORD },
    });
  } catch (e) {
    // @ts-expect-error
    console.error('Failed to clear Elasticsearch cache:', e.message);
  }
}

// @ts-expect-error
function debugOutput(page: puppeteer.Page) {
  page.on('response', (response) => {
    console.log(response.url(), response.status());
  });

  page.on('error', function (err) {
    console.log('Error: ', err);
  });

  page.on('pageerror', function (err) {
    console.log('Page error: ', err);
  });
}

function getAverageRequestTimings() {
  return Object.entries(groupBy(apmRequestsTimingsList, (obj) => obj.name)).map(
    ([name, obj]) => {
      return {
        name,
        avg: meanBy(obj, (o) => o.endTime),
      };
    }
  );
}

type ApmRequestTimings = Awaited<ReturnType<typeof getApmRequestTimings>>;
async function getApmRequestTimings(page: puppeteer.Page) {
  const perfEntries = JSON.parse(
    await page.evaluate(() => JSON.stringify(performance.getEntries()))
  ) as PerformanceEntryList;

  const apmRequestsTimings = perfEntries
    .filter((entry) => entry.name.includes('internal/apm/'))
    .map((entry) => {
      return {
        name: entry.name,
        startTime: entry.startTime,
        duration: entry.duration,
        endTime: entry.startTime + entry.duration,
      };
    });
  return apmRequestsTimings;
}
