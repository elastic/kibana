/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ok } from 'assert';
import type { RunFn } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { getAgentDownloadUrl, getAgentFileName } from '../common/fleet_services';
import { downloadAndStoreAgent } from '../common/agent_downloads_service';

// Decrement the patch version by 1
const decrementPatchVersion = (version: string): string => {
  const [major, minor, patch] = version.split('.').map(Number);
  return `${major}.${minor}.${patch - 1}`;
};

// Generate a list of versions to attempt downloading, including a fallback to the previous patch (GA)
const getVersionsToDownload = (version: string): string[] => {
  const patch = parseInt(version.split('.')[2], 10);

  // If patch version is 0, return only the current version.
  if (patch === 0) {
    return [version];
  }

  return [version, decrementPatchVersion(version)];
};
// Download and store the Elastic Agent for the specified version(s)
const downloadAndStoreElasticAgent = async (
  version: string,
  closestMatch: boolean,
  log: ToolingLog
): Promise<void> => {
  const versionsToDownload = getVersionsToDownload(version);

  for (const v of versionsToDownload) {
    try {
      const { url } = await getAgentDownloadUrl(v, closestMatch, log);
      const fileName = `${getAgentFileName(v)}.tar.gz`;

      await downloadAndStoreAgent(url, fileName);
      log.info(`Successfully downloaded and stored version ${v}`);
      return; // Exit once successful
    } catch (error) {
      log.error(`Failed to download or store version ${v}: ${error.message}`);
    }
  }

  log.error(`Failed to download agent for any available version: ${versionsToDownload.join(', ')}`);
};

const isValidVersion = (version: string): boolean => {
  return /^\d+\.\d+\.\d+$/.test(version); // Validate semantic version format
};

export const agentDownloaderRunner: RunFn = async (cliContext) => {
  const { version } = cliContext.flags;

  ok(version, 'version argument is required');

  // Validate version format
  if (!isValidVersion(version as string)) {
    throw new Error('Invalid version format');
  }

  await downloadAndStoreElasticAgent(
    version as string,
    cliContext.flags.closestMatch as boolean,
    cliContext.log
  );
};
