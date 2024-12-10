/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ok } from 'assert';
import type { RunFn } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import semver from 'semver';
import { getAgentDownloadUrl, getAgentFileName } from '../common/fleet_services';
import { downloadAndStoreAgent } from '../common/agent_downloads_service';

// Decrement the patch version by 1 and preserve pre-release tag (if any)
const decrementPatchVersion = (version: string): string | null => {
  const parsedVersion = semver.parse(version);
  if (!parsedVersion) {
    return null;
  }
  const newPatchVersion = parsedVersion.patch - 1;
  // Create a new version string with the decremented patch - removing any possible pre-release tag
  const newVersion = `${parsedVersion.major}.${parsedVersion.minor}.${newPatchVersion}`;
  return semver.valid(newVersion) ? newVersion : null;
};

// Generate a list of versions to attempt downloading, including a fallback to the previous patch (GA)
const getVersionsToDownload = (version: string): string[] => {
  const parsedVersion = semver.parse(version);
  if (!parsedVersion) return [];
  // If patch version is 0, return only the current version.
  if (parsedVersion.patch === 0) {
    return [version];
  }

  const decrementedVersion = decrementPatchVersion(version);
  return decrementedVersion ? [version, decrementedVersion] : [version];
};

// Download and store the Elastic Agent for the specified version(s)
const downloadAndStoreElasticAgent = async (
  version: string,
  closestMatch: boolean,
  log: ToolingLog
): Promise<void> => {
  const versionsToDownload = getVersionsToDownload(version);

  // Download all the versions in the list
  for (const versionToDownload of versionsToDownload) {
    try {
      const { url } = await getAgentDownloadUrl(versionToDownload, closestMatch, log);
      const fileName = `${getAgentFileName(versionToDownload)}.tar.gz`;

      await downloadAndStoreAgent(url, fileName);
      log.info(`Successfully downloaded and stored version ${versionToDownload}`);
    } catch (error) {
      log.error(`Failed to download or store version ${versionToDownload}: ${error.message}`);
    }
  }
};

export const agentDownloaderRunner: RunFn = async (cliContext) => {
  const { version } = cliContext.flags;

  ok(version, 'version argument is required');

  // Validate version format
  if (!semver.valid(version as string)) {
    throw new Error('Invalid version format');
  }

  await downloadAndStoreElasticAgent(
    version as string,
    cliContext.flags.closestMatch as boolean,
    cliContext.log
  );
};
