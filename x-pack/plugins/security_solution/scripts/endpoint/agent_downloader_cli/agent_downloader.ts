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

const downloadAndStoreElasticAgent = async (
  version: string,
  closestMatch: boolean,
  log: ToolingLog
) => {
  const downloadUrlResponse = await getAgentDownloadUrl(version, closestMatch, log);
  const fileNameNoExtension = getAgentFileName(version);
  const agentFile = `${fileNameNoExtension}.tar.gz`;
  await downloadAndStoreAgent(downloadUrlResponse.url, agentFile);
};

export const agentDownloaderRunner: RunFn = async (cliContext) => {
  ok(cliContext.flags.version, 'version argument is required');
  await downloadAndStoreElasticAgent(
    cliContext.flags.version as string,
    cliContext.flags.closestMatch as boolean,
    cliContext.log
  );
};
