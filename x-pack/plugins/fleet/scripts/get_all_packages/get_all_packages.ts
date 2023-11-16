/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { kibanaPackageJson } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import { chunk } from 'lodash';

import yargs from 'yargs/yargs';

import type { PackageInfo } from '../../common';

const REGISTRY_URL = 'https://epr.elastic.co';
const KIBANA_URL = 'http://localhost:5601';
const KIBANA_USERNAME = 'elastic';
const KIBANA_PASSWORD = 'changeme';
const KIBANA_VERSION = kibanaPackageJson.version;
const PUBLIC_VERSION_V1 = '2023-10-31';

const { base = '', prerelease = false, batchSize = 1 } = yargs(process.argv).argv;

const logger = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

interface Result {
  pkg: string;
  epr: number;
  archive: number;
  archiveCached: number;
}
async function getPackage(name: string, version: string, full: boolean = false) {
  const start = Date.now();
  let body;
  let end;
  let res;
  try {
    res = await fetch(
      `${KIBANA_URL}${base}/api/fleet/epm/packages/${name}/${version}?prerelease=true${
        full ? '&full=true' : ''
      }`,
      {
        headers: {
          accept: '*/*',
          'content-type': 'application/json',
          'kbn-xsrf': 'xyz',
          Authorization:
            'Basic ' + Buffer.from(`${KIBANA_USERNAME}:${KIBANA_PASSWORD}`).toString('base64'),
          // Note: version can change in the future
          'Elastic-Api-Version': PUBLIC_VERSION_V1,
        },
        method: 'GET',
      }
    );
    end = Date.now();

    body = await res.json();
  } catch (e) {
    logger.error(`Error reaching Kibana: ${e}`);
    logger.info('If your kibana uses a base path, please set it with the --base /<your-base> flag');
    throw e;
  }

  if (body.item && body.item.name) {
    return { pkg: body.item, status: body.status, took: (end - start) / 1000 };
  }

  throw new Error(`Invalid package returned for ${name}-${version} : ${JSON.stringify(res)}`);
}

async function getAllPackages() {
  const res = await fetch(
    `${REGISTRY_URL}/search?kibana.version=${KIBANA_VERSION}${
      prerelease ? '&prerelease=true' : ''
    }`,
    {
      headers: {
        accept: '*/*',
      },
      method: 'GET',
    }
  );
  const body = await res.json();
  return body as PackageInfo[];
}

async function performTest({ name, version }: { name: string; version: string }): Promise<Result> {
  const eprResult = await getPackage(name, version);
  const archiveResult = await getPackage(name, version, true);
  const cachedArchiveResult = await getPackage(name, version, true);
  logger.info(`✅ ${name}-${version}`);

  return {
    pkg: `${name}-${version}`,
    epr: eprResult.took,
    archive: archiveResult.took,
    archiveCached: cachedArchiveResult.took,
  };
}

export async function run() {
  const allPackages = await getAllPackages();

  const batches = chunk(allPackages, batchSize as number);
  let allResults: Result[] = [];

  const start = Date.now();
  for (const batch of batches) {
    const results = await Promise.all(batch.map(performTest));
    allResults = [...allResults, ...(results.filter((v) => v) as Result[])];
  }
  const end = Date.now();
  const took = (end - start) / 1000;
  allResults.sort((a, b) => b.archive - a.archive);
  logger.info(`Took ${took} seconds to get ${allResults.length} packages`);
  logger.info(
    'Average EPM time: ' + allResults.reduce((acc, { epr }) => acc + epr, 0) / allResults.length
  );
  logger.info(
    'Average Archive time: ' +
      allResults.reduce((acc, { archive }) => acc + archive, 0) / allResults.length
  );
  logger.info(
    'Average Cache time: ' +
      allResults.reduce((acc, { archiveCached }) => acc + archiveCached, 0) / allResults.length
  );
  // eslint-disable-next-line no-console
  console.table(allResults);
}
