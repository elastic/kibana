/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APIRequestContext, expect, Locator, TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { HeaderBar } from './pom/components/header_bar.component';
import { SpaceSelector } from './pom/components/space_selector.component';
import { log } from './lib/logger';

const apiKey = process.env.API_KEY ?? '';
const outputDirectory = process.env.HOSTS_DIR ?? '';

type WaitForRes = [locatorIndex: number, locator: Locator];

export async function waitForOneOf(locators: Locator[]): Promise<WaitForRes> {
  const res = await Promise.race([
    ...locators.map(async (locator, index): Promise<WaitForRes> => {
      let timedOut = false;
      await locator.waitFor({ state: 'visible' }).catch(() => (timedOut = true));
      return [timedOut ? -1 : index, locator];
    }),
  ]);
  if (res[0] === -1) {
    throw new Error('No locator is visible before timeout.');
  }
  return res;
}

export async function spaceSelectorStateful(headerBar: HeaderBar, spaceSelector: SpaceSelector) {
  const [index] = await waitForOneOf([headerBar.helpMenuButton(), spaceSelector.spaceSelector()]);
  const selector = index === 1;
  if (selector) {
    await spaceSelector.selectDefault();
    await headerBar.assertHelpMenuButton();
  }
}

export async function checkHostData(request: APIRequestContext) {
  log.info(`... checking node data.`);
  const currentTime = Date.now();
  const rangeTime = currentTime - 1200000;

  const b = await request.post('api/metrics/snapshot', {
    headers: {
      accept: 'application/json',
      Authorization: apiKey,
      'Content-Type': 'application/json;charset=UTF-8',
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'kibana',
    },
    data: {
      filterQuery: '',
      metrics: [{ type: 'cpu' }],
      nodeType: 'host',
      sourceId: 'default',
      accountId: '',
      region: '',
      groupBy: [],
      timerange: { interval: '1m', to: currentTime, from: rangeTime, lookbackSize: 5 },
      includeTimeseries: true,
      dropPartialBuckets: true,
    },
  });
  expect(b.status()).toBe(200);
  const jsonDataNode = JSON.parse(await b.text());
  const nodesArr = jsonDataNode.nodes;
  expect(
    nodesArr,
    'The number of available nodes in the Inventory should not be less than 1.'
  ).not.toHaveLength(0);
  if (b.status() === 200) {
    log.info(`✓ Node data is checked.`);
  }
}

export async function checkPodData(request: APIRequestContext) {
  log.info(`... checking pod data.`);
  const currentTime = Date.now();
  const rangeTime = currentTime - 1200000;

  const response = await request.post('api/metrics/snapshot', {
    headers: {
      accept: 'application/json',
      Authorization: apiKey,
      'Content-Type': 'application/json;charset=UTF-8',
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'kibana',
    },
    data: {
      filterQuery: '',
      metrics: [{ type: 'cpu' }],
      nodeType: 'pod',
      sourceId: 'default',
      accountId: '',
      region: '',
      groupBy: [],
      timerange: { interval: '1m', to: currentTime, from: rangeTime, lookbackSize: 5 },
      includeTimeseries: true,
      dropPartialBuckets: true,
    },
  });
  expect(response.status()).toBe(200);
  const jsonData = JSON.parse(await response.text());
  const nodesArr = jsonData.nodes;
  expect(
    nodesArr,
    'The number of available pods in the Inventory should not be less than 1.'
  ).not.toHaveLength(0);
  log.info(`✓ Pod data is checked.`);
}

export async function writeFileReportHosts(
  asyncResults: object[],
  request: APIRequestContext,
  testInfo: TestInfo,
  testStartTime: number
) {
  const a = await request.get(`${process.env.ELASTICSEARCH_HOST}`, {
    headers: {
      accept: '*/*',
      Authorization: apiKey,
      'kbn-xsrf': 'reporting',
    },
  });

  expect(a.status()).toBe(200);

  const jsonDataCluster = JSON.parse(await a.text());
  const versionNumber = jsonDataCluster.version.number;
  const clusterName = jsonDataCluster.cluster_name;
  const clusterUuid = jsonDataCluster.cluster_uuid;

  const resultsObj = asyncResults.reduce((acc, obj) => {
    return { ...acc, ...obj };
  }, {});
  const fileName = `${new Date(testStartTime).toISOString().replace(/:/g, '_')}.json`;
  const outputPath = path.join(outputDirectory, fileName);
  const reportData = {
    name: testInfo.title,
    cluster_name: clusterName,
    cluster_uuid: clusterUuid,
    version: versionNumber,
    date: testStartTime,
    time_window: `Last ${process.env.TIME_VALUE} ${process.env.TIME_UNIT}`,
    measurements: resultsObj,
  };
  fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2));
}
