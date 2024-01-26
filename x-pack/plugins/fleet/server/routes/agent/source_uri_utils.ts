/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { downloadSourceService } from '../../services';
import type { AgentPolicy } from '../../types';
import { FleetError, DownloadSourceNotFound } from '../../errors';

export const getSourceUriForAgentPolicy = async (
  soClient: SavedObjectsClientContract,
  agentPolicy: AgentPolicy
) => {
  const defaultDownloadSourceId = await downloadSourceService.getDefaultDownloadSourceId(soClient);

  if (!defaultDownloadSourceId) {
    throw new FleetError('Default download source host is not setup');
  }
  const downloadSourceId: string = agentPolicy.download_source_id || defaultDownloadSourceId;
  const downloadSource = await downloadSourceService.get(soClient, downloadSourceId);
  if (!downloadSource) {
    throw new DownloadSourceNotFound(`Download source host not found ${downloadSourceId}`);
  }
  return { host: downloadSource.host, proxy_id: downloadSource.proxy_id };
};
