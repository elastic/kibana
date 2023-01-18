/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { kibanaPackageJson } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import yargs from 'yargs';

const DEFAULT_REGISTRY_URL = 'https://epr.elastic.co';
const DEFAULT_KIBANA_URL = 'http://localhost:5601';
const DEFAULT_KIBANA_USERNAME = 'elastic';
const DEFAULT_KIBANA_PASSWORD = 'changeme';
const KIBANA_VERSION = kibanaPackageJson.version;

const logger = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

const {
  registryUrl = DEFAULT_REGISTRY_URL,
  kibanaUrl = DEFAULT_KIBANA_URL,
  kibanaUsername = DEFAULT_KIBANA_USERNAME,
  kibanaPassword = DEFAULT_KIBANA_PASSWORD,
  skip: skipPackagesArg,
  delete: deletePackages = false,
  // ignore yargs positional args
  _,
  $0,
  ...otherArgs
} = yargs(process.argv.slice(2)).argv;

const skipPackages = typeof skipPackagesArg === 'string' ? skipPackagesArg.split(',') : [];
const printUsage = () =>
  logger.info(`
    Install all packages from the specified package registry

    Usage: node install_all_packages [--registryUrl=${DEFAULT_REGISTRY_URL}] [--kibanaUrl=${DEFAULT_KIBANA_URL}] [--kibanaUsername=${DEFAULT_KIBANA_USERNAME}] [--kibanaPassword=${DEFAULT_KIBANA_PASSWORD}] [--delete]
  `);

if (Object.keys(otherArgs).length > 0) {
  logger.error('Unknown arguments: ' + Object.keys(otherArgs).join(', '));
  printUsage();
  process.exit(1);
}

const Authorization =
  'Basic ' + Buffer.from(`${kibanaUsername}:${kibanaPassword}`).toString('base64');

async function installPackage(name: string, version: string) {
  const start = Date.now();
  const res = await fetch(`${kibanaUrl}/api/fleet/epm/packages/${name}/${version}`, {
    headers: {
      accept: '*/*',
      'content-type': 'application/json',
      'kbn-xsrf': 'xyz',
      Authorization,
    },
    body: JSON.stringify({ force: true }),
    method: 'POST',
  });
  const end = Date.now();

  const body = await res.json();

  return { body, status: res.status, took: (end - start) / 1000, didError: res.status !== 200 };
}

async function deletePackage(name: string, version: string) {
  const res = await fetch(`${kibanaUrl}/api/fleet/epm/packages/${name}-${version}`, {
    headers: {
      accept: '*/*',
      'content-type': 'application/json',
      'kbn-xsrf': 'xyz',
      Authorization,
    },
    method: 'DELETE',
  });

  const body = await res.json();

  return { body, status: res.status, didError: res.status !== 200 };
}

async function getAllPackages() {
  const res = await fetch(
    `${registryUrl}/search?prerelease=true&kibana.version=${KIBANA_VERSION}`,
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
  const allPackages = await getAllPackages();

  let errorCount = 0;

  const updateErrorCount = (result: { didError: boolean }) => {
    if (result.didError) {
      errorCount++;
    }
  };

  logger.info('INSTALLING packages');

  for (const pkg of allPackages) {
    if (skipPackages.includes(pkg.name)) {
      logger.info(`Skipping ${pkg.name}`);
      continue;
    }
    const result = await installPackage(pkg.name, pkg.version);
    updateErrorCount(result);

    logResult(pkg, result);
  }

  if (deletePackages) {
    logger.info('DELETING packages');
    for (const pkg of allPackages) {
      if (skipPackages.includes(pkg.name)) {
        logger.info(`Skipping ${pkg.name}`);
        continue;
      }
      const result = await deletePackage(pkg.name, pkg.version);
      updateErrorCount(result);

      logResult(pkg, result);
    }
  }

  if (errorCount > 0) {
    logger.error(`There were ${errorCount} errors, exiting with code`);
    process.exit(1);
  }
}
