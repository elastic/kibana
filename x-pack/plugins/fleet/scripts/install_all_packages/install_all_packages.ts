/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { ToolingLog } from '@kbn/dev-utils';
import ReadPackage from 'read-pkg';

const REGISTRY_URL = 'https://epr-snapshot.elastic.co';
const KIBANA_URL = 'http://localhost:5601';
const KIBANA_USERNAME = 'elastic';
const KIBANA_PASSWORD = 'changeme';

const KIBANA_VERSION = ReadPackage.sync().version;

const SKIP_PACKAGES: string[] = [];

async function installPackage(name: string, version: string) {
  const start = Date.now();
  const res = await fetch(`${KIBANA_URL}/api/fleet/epm/packages/${name}/${version}`, {
    headers: {
      accept: '*/*',
      'content-type': 'application/json',
      'kbn-xsrf': 'xyz',
      Authorization:
        'Basic ' + Buffer.from(`${KIBANA_USERNAME}:${KIBANA_PASSWORD}`).toString('base64'),
    },
    body: JSON.stringify({ force: true }),
    method: 'POST',
  });
  const end = Date.now();

  const body = await res.json();

  return { body, status: res.status, took: (end - start) / 1000 };
}

async function deletePackage(name: string, version: string) {
  const res = await fetch(`${KIBANA_URL}/api/fleet/epm/packages/${name}-${version}`, {
    headers: {
      accept: '*/*',
      'content-type': 'application/json',
      'kbn-xsrf': 'xyz',
      Authorization:
        'Basic ' + Buffer.from(`${KIBANA_USERNAME}:${KIBANA_PASSWORD}`).toString('base64'),
    },
    method: 'DELETE',
  });

  const body = await res.json();

  return { body, status: res.status };
}

async function getAllPackages() {
  const res = await fetch(
    `${REGISTRY_URL}/search?experimental=true&kibana.version=${KIBANA_VERSION}`,
    {
      headers: {
        accept: '*/*',
      },
      method: 'GET',
    }
  );
  const body = await res.json();
  return body;
}

function logResult(
  logger: ToolingLog,
  pkg: { name: string; version: string },
  result: { took?: number; status?: number }
) {
  const pre = `${pkg.name}-${pkg.version} ${result.took ? ` took ${result.took}s` : ''} : `;
  if (result.status !== 200) {
    logger.info('❌ ' + pre + JSON.stringify(result));
  } else {
    logger.info('✅ ' + pre + 200);
  }
}

export async function run() {
  const logger = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });
  const allPackages = await getAllPackages();

  logger.info('INSTALLING packages');

  for (const pkg of allPackages) {
    if (SKIP_PACKAGES.includes(pkg.name)) {
      logger.info(`Skipping ${pkg.name}`);
      continue;
    }
    const result = await installPackage(pkg.name, pkg.version);

    logResult(logger, pkg, result);
  }

  const deletePackages = process.argv.includes('--delete');

  if (!deletePackages) return;

  logger.info('DELETING packages');
  for (const pkg of allPackages) {
    if (SKIP_PACKAGES.includes(pkg.name)) {
      logger.info(`Skipping ${pkg.name}`);
      continue;
    }
    const result = await deletePackage(pkg.name, pkg.version);

    logResult(logger, pkg, result);
  }
}
