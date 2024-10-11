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
// Utility to decrement the patch version
const decrementPatchVersion = (version: string): string => {
  const versionParts = version.split('.');
  const patch = parseInt(versionParts[2], 10);

  versionParts[2] = (patch - 1).toString();
  return versionParts.join('.');
};

// Utility to generate list of versions to download
const getVersionsToDownload = (version: string): string[] => {
  const versions = [version];
  const patch = parseInt(version.split('.')[2], 10);

  if (!Number.isNaN(patch) && patch > 0) {
    versions.push(decrementPatchVersion(version));
  }

  return versions;
};

const downloadAndStoreElasticAgent = async (
  version: string,
  closestMatch: boolean,
  log: ToolingLog
) => {
  try {
    const versionsToDownload = getVersionsToDownload(version);

    for (const v of versionsToDownload) {
      const downloadUrlResponse = await getAgentDownloadUrl(v, closestMatch, log);
      const fileNameNoExtension = getAgentFileName(v);
      const agentFile = `${fileNameNoExtension}.tar.gz`;

      try {
        await downloadAndStoreAgent(downloadUrlResponse.url, agentFile);
        log.info(`Successfully downloaded and stored version ${v}`);
      } catch (downloadError) {
        log.error(`Failed to download or store version ${v}: ${downloadError.message}`);
      }
    }
  } catch (error) {
    log.error(`Failed to process version ${version}: ${error.message}`);
  }
};

export const agentDownloaderRunner: RunFn = async (cliContext) => {
  ok(cliContext.flags.version, 'version argument is required');
  await downloadAndStoreElasticAgent(
    cliContext.flags.version as string,
    cliContext.flags.closestMatch as boolean,
    cliContext.log
  );
};
