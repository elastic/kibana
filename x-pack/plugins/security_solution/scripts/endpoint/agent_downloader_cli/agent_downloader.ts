/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ok } from 'assert';
import type { RunFn } from '@kbn/dev-cli-runner';
import { getAgentDownloadUrl, getAgentFileName } from '../common/fleet_services';
import { downloadAndStoreAgent } from '../common/agent_downloads_service';

const downloadAndStoreElasticAgent = async (version: string, closestMatch: boolean) => {
  const downloadUrlResponse = await getAgentDownloadUrl(version, closestMatch);
  let fileVersion: string = version;
  if (downloadUrlResponse.fileName.match('SNAPSHOT')) {
    fileVersion = `${version}-SNAPSHOT`;
  }
  const fileNameNoExtension = getAgentFileName(fileVersion);
  const agentFile = `${fileNameNoExtension}.tar.gz`;
  await downloadAndStoreAgent(downloadUrlResponse.url, agentFile);
};

export const agentDownloaderRunner: RunFn = async (cliContext) => {
  ok(cliContext.flags.version, 'version argument is required');
  await downloadAndStoreElasticAgent(
    cliContext.flags.version as string,
    cliContext.flags.closestMatch as boolean
  );
};
