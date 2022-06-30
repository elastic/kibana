/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { downloadSourceService, agentPolicyService } from '../../services';
import type { Agent, AgentPolicy } from '../../types';

export const getSourceUriForAgent = async (soClient: SavedObjectsClientContract, agent: Agent) => {
  if (!agent.policy_id) {
    throw new Error('Agent.policy_id not found');
  }
  const agentPolicy = await agentPolicyService.get(soClient, agent.policy_id, false);
  if (!agentPolicy) {
    throw new Error('Agent Policy not found');
  }
  return getSourceUriForAgentPolicy(soClient, agentPolicy);
};

export const getSourceUriForAgentPolicy = async (
  soClient: SavedObjectsClientContract,
  agentPolicy: AgentPolicy
) => {
  const defaultDownloadSourceId = await downloadSourceService.getDefaultDownloadSourceId(soClient);

  if (!defaultDownloadSourceId) {
    throw new Error('Default download source host is not setup');
  }
  const downloadSourceId: string = agentPolicy.download_source_id || defaultDownloadSourceId;
  const downloadSource = await downloadSourceService.get(soClient, downloadSourceId);
  if (!downloadSource) {
    throw new Error(`Download source host not found ${downloadSourceId}`);
  }
  return downloadSource.host;
};
