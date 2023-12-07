/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { v4 as uuidv4 } from 'uuid';

import type { Agent } from '../../types';
import { HostedAgentPolicyRestrictionRelatedError } from '../../errors';
import { SO_SEARCH_LIMIT } from '../../constants';

import { createAgentAction } from './actions';
import type { GetAgentsOptions } from './crud';
import { openPointInTime } from './crud';
import { getAgentsByKuery } from './crud';
import { getAgentById, getAgents, updateAgent, getAgentPolicyForAgent } from './crud';
import {
  invalidateAPIKeysForAgents,
  UnenrollActionRunner,
  unenrollBatch,
  updateActionsForForceUnenroll,
} from './unenroll_action_runner';

async function unenrollAgentIsAllowed(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string
) {
  const agentPolicy = await getAgentPolicyForAgent(soClient, esClient, agentId);
  if (agentPolicy?.is_managed) {
    throw new HostedAgentPolicyRestrictionRelatedError(
      `Cannot unenroll ${agentId} from a hosted agent policy ${agentPolicy.id}`
    );
  }

  return true;
}

export async function unenrollAgent(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string,
  options?: {
    force?: boolean;
    revoke?: boolean;
  }
) {
  if (!options?.force) {
    await unenrollAgentIsAllowed(soClient, esClient, agentId);
  }
  if (options?.revoke) {
    return forceUnenrollAgent(esClient, soClient, agentId);
  }
  const now = new Date().toISOString();
  await createAgentAction(esClient, {
    agents: [agentId],
    created_at: now,
    type: 'UNENROLL',
  });
  await updateAgent(esClient, agentId, {
    unenrollment_started_at: now,
  });
}

export async function unenrollAgents(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: GetAgentsOptions & {
    force?: boolean;
    revoke?: boolean;
    batchSize?: number;
    showInactive?: boolean;
  }
): Promise<{ actionId: string }> {
  if ('agentIds' in options) {
    const givenAgents = await getAgents(esClient, soClient, options);
    return await unenrollBatch(soClient, esClient, givenAgents, options);
  }

  const batchSize = options.batchSize ?? SO_SEARCH_LIMIT;
  const res = await getAgentsByKuery(esClient, soClient, {
    kuery: options.kuery,
    showInactive: options.showInactive ?? false,
    page: 1,
    perPage: batchSize,
  });
  if (res.total <= batchSize) {
    const givenAgents = await getAgents(esClient, soClient, options);
    return await unenrollBatch(soClient, esClient, givenAgents, options);
  } else {
    return await new UnenrollActionRunner(
      esClient,
      soClient,
      {
        ...options,
        batchSize,
        total: res.total,
      },
      { pitId: await openPointInTime(esClient) }
    ).runActionAsyncWithRetry();
  }
}

export async function forceUnenrollAgent(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agentIdOrAgent: string | Agent
) {
  const agent =
    typeof agentIdOrAgent === 'string'
      ? await getAgentById(esClient, soClient, agentIdOrAgent)
      : agentIdOrAgent;

  await invalidateAPIKeysForAgents([agent]);
  await updateAgent(esClient, agent.id, {
    active: false,
    unenrolled_at: new Date().toISOString(),
  });
  await updateActionsForForceUnenroll(esClient, [agent.id], uuidv4(), 1);
}
