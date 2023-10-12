/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';
import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { uniq } from 'lodash';
import semverGte from 'semver/functions/gte';
import semverGt from 'semver/functions/gt';
import semverCoerce from 'semver/functions/coerce';

import { appContextService } from '..';

const MINIMUM_SUPPORTED_VERSION = '7.17.0';
const AGENT_VERSION_BUILD_FILE = 'x-pack/plugins/fleet/target/agent_versions_list.json';

let availableVersions: string[] | undefined;

export const getLatestAvailableVersion = async (
  includeCurrentVersion?: boolean
): Promise<string> => {
  const versions = await getAvailableVersions({ includeCurrentVersion });

  return versions[0];
};

export const getAvailableVersions = async ({
  cached = true,
  includeCurrentVersion,
}: {
  cached?: boolean;
  includeCurrentVersion?: boolean;
}): Promise<string[]> => {
  // Use cached value to avoid reading from disk each time
  if (cached && availableVersions) {
    return availableVersions;
  }

  // Read a static file generated at build time
  const config = appContextService.getConfig();
  let versionsToDisplay: string[] = [];

  const kibanaVersion = appContextService.getKibanaVersion();

  try {
    const file = await readFile(Path.join(REPO_ROOT, AGENT_VERSION_BUILD_FILE), 'utf-8');

    // Exclude versions older than MINIMUM_SUPPORTED_VERSION and pre-release versions (SNAPSHOT, rc..)
    // De-dup and sort in descending order
    const data: string[] = JSON.parse(file);

    const versions = data
      .map((item: any) => semverCoerce(item)?.version || '')
      .filter((v: any) => semverGte(v, MINIMUM_SUPPORTED_VERSION))
      .sort((a: any, b: any) => (semverGt(a, b) ? -1 : 1));
    versionsToDisplay = uniq(versions) as string[];

    const appendCurrentVersion = includeCurrentVersion;

    if (appendCurrentVersion) {
      // Add current version if not already present
      const hasCurrentVersion = versionsToDisplay.some((v) => v === kibanaVersion);

      versionsToDisplay = !hasCurrentVersion
        ? [kibanaVersion].concat(versionsToDisplay)
        : versionsToDisplay;
    }

    availableVersions = versionsToDisplay;

    return availableVersions;
  } catch (e) {
    if (e.code === 'ENOENT') {
      return config?.internal?.onlyAllowAgentUpgradeToKnownVersions ? [] : [kibanaVersion];
    }
    throw e;
  }
};
