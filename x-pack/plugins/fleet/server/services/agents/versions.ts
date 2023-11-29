/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';
import Path from 'path';

import fetch from 'node-fetch';
import pRetry from 'p-retry';
import { uniq } from 'lodash';
import semverGte from 'semver/functions/gte';
import semverGt from 'semver/functions/gt';
import semverCoerce from 'semver/functions/coerce';

import { REPO_ROOT } from '@kbn/repo-info';

import { appContextService } from '..';

const MINIMUM_SUPPORTED_VERSION = '7.17.0';
const AGENT_VERSION_BUILD_FILE = 'x-pack/plugins/fleet/target/agent_versions_list.json';

// Endpoint maintained by the web-team and hosted on the elastic website
const PRODUCT_VERSIONS_URL = 'https://www.elastic.co/api/product_versions';

// Cache available versions in memory for 1 hour
const CACHE_DURATION = 1000 * 60 * 60;
let CACHED_AVAILABLE_VERSIONS: string[] | undefined;
let LAST_FETCHED: number | undefined;

export const getLatestAvailableVersion = async (
  includeCurrentVersion?: boolean
): Promise<string> => {
  const versions = await getAvailableVersions({ includeCurrentVersion });

  return versions[0];
};

export const getAvailableVersions = async ({
  includeCurrentVersion,
  ignoreCache = false, // This is only here to allow us to ignore the cache in tests
}: {
  includeCurrentVersion?: boolean;
  ignoreCache?: boolean;
} = {}): Promise<string[]> => {
  const logger = appContextService.getLogger();

  if (LAST_FETCHED && !ignoreCache) {
    const msSinceLastFetched = Date.now() - (LAST_FETCHED || 0);

    if (msSinceLastFetched < CACHE_DURATION && CACHED_AVAILABLE_VERSIONS !== undefined) {
      logger.debug(`Cache is valid, returning cached available versions`);

      return CACHED_AVAILABLE_VERSIONS;
    }

    logger.debug('Cache has expired, fetching available versions from disk + API');
  }

  const config = appContextService.getConfig();
  const kibanaVersion = appContextService.getKibanaVersion();

  let availableVersions: string[] = [];

  // First, grab available versions from the static file that's placed on disk at build time
  try {
    const file = await readFile(Path.join(REPO_ROOT, AGENT_VERSION_BUILD_FILE), 'utf-8');
    const data: string[] = JSON.parse(file);

    availableVersions = [...availableVersions, ...data];
  } catch (error) {
    // If we can't read from the file, the error is non-blocking. We'll try to source data from the
    // product versions API later.
    logger.debug(`Error reading file ${AGENT_VERSION_BUILD_FILE}: ${error.message}`);
  }

  // Next, fetch from the product versions API. This API call is aggressively cached, so we won't
  // fetch from the live API more than `TIME_BETWEEN_FETCHES` milliseconds.
  const apiVersions = await fetchAgentVersionsFromApi();

  // Coerce each version to a semver object and compare to our `MINIMUM_SUPPORTED_VERSION` - we
  // only want support versions in the final result. We'll also sort by newest version first.
  availableVersions = uniq([...availableVersions, ...apiVersions])
    .map((item: any) => semverCoerce(item)?.version || '')
    .filter((v: any) => semverGte(v, MINIMUM_SUPPORTED_VERSION))
    .sort((a: any, b: any) => (semverGt(a, b) ? -1 : 1));

  // If the current stack version isn't included in the list of available versions, add it
  // at the front of the array
  const hasCurrentVersion = availableVersions.some((v) => v === kibanaVersion);
  if (includeCurrentVersion && !hasCurrentVersion) {
    availableVersions = [kibanaVersion, ...availableVersions];
  }

  // Allow upgrading to the current stack version if this override flag is provided via `kibana.yml`.
  // This is useful for development purposes.
  if (availableVersions.length === 0 && !config?.internal?.onlyAllowAgentUpgradeToKnownVersions) {
    availableVersions = [kibanaVersion];
  }

  // Don't prime the cache in tests
  if (!ignoreCache) {
    CACHED_AVAILABLE_VERSIONS = availableVersions;
    LAST_FETCHED = Date.now();
  }

  return availableVersions;
};

async function fetchAgentVersionsFromApi() {
  const logger = appContextService.getLogger();

  const options = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await pRetry(() => fetch(PRODUCT_VERSIONS_URL, options), { retries: 1 });
  const rawBody = await response.text();

  // We need to handle non-200 responses gracefully here to support airgapped environments where
  // Kibana doesn't have internet access to query this API
  if (response.status >= 400) {
    logger.debug(`Status code ${response.status} received from versions API: ${rawBody}`);
    return [];
  }

  const jsonBody = JSON.parse(rawBody);

  const versions: string[] = (jsonBody.length ? jsonBody[0] : [])
    .filter((item: any) => item?.title?.includes('Elastic Agent'))
    .map((item: any) => item?.version_number);

  return versions;
}
