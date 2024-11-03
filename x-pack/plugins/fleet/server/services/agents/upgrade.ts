/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type { Agent } from '../../types';
import { AgentReassignmentError, HostedAgentPolicyRestrictionRelatedError } from '../../errors';
import { SO_SEARCH_LIMIT } from '../../constants';

import { agentsKueryNamespaceFilter } from '../spaces/agent_namespaces';
import { getCurrentNamespace } from '../spaces/get_current_namespace';

import { createAgentAction } from './actions';
import type { GetAgentsOptions } from './crud';
import { openPointInTime } from './crud';
import { getAgentsByKuery } from './crud';
import { getAgentsById, updateAgent, getAgentPolicyForAgent } from './crud';
import { UpgradeActionRunner, upgradeBatch } from './upgrade_action_runner';

export async function sendUpgradeAgentAction({
  soClient,
  esClient,
  agentId,
  version,
  sourceUri,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  agentId: string;
  version: string;
  sourceUri: string | undefined;
}) {
  const now = new Date().toISOString();
  const data = {
    version,
    sourceURI: sourceUri,
  };

  const agentPolicy = await getAgentPolicyForAgent(soClient, esClient, agentId);
  if (agentPolicy?.is_managed) {
    throw new HostedAgentPolicyRestrictionRelatedError(
      `Cannot upgrade agent ${agentId} in hosted agent policy ${agentPolicy.id}`
    );
  }

  const currentSpaceId = getCurrentNamespace(soClient);

  await createAgentAction(esClient, {
    agents: [agentId],
    created_at: now,
    data,
    ack_data: data,
    type: 'UPGRADE',
    namespaces: [currentSpaceId],
  });
  await updateAgent(esClient, agentId, {
    upgraded_at: null,
    upgrade_started_at: now,
  });
}

export async function sendUpgradeAgentsActions(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: ({ agents: Agent[] } | GetAgentsOptions) & {
    version: string;
    sourceUri?: string | undefined;
    force?: boolean;
    skipRateLimitCheck?: boolean;
    upgradeDurationSeconds?: number;
    startTime?: string;
    batchSize?: number;
  }
): Promise<{ actionId: string }> {
  const currentSpaceId = getCurrentNamespace(soClient);
  // Full set of agents
  const outgoingErrors: Record<Agent['id'], Error> = {};
  let givenAgents: Agent[] = [];

  if ('agents' in options) {
    givenAgents = options.agents;
  } else if ('agentIds' in options) {
    const maybeAgents = await getAgentsById(esClient, soClient, options.agentIds);
    for (const maybeAgent of maybeAgents) {
      if ('notFound' in maybeAgent) {
        outgoingErrors[maybeAgent.id] = new AgentReassignmentError(
          `Cannot find agent ${maybeAgent.id}`
        );
      } else {
        givenAgents.push(maybeAgent);
      }
    }
  } else if ('kuery' in options) {
    const batchSize = options.batchSize ?? SO_SEARCH_LIMIT;
    const namespaceFilter = await agentsKueryNamespaceFilter(currentSpaceId);
    const kuery = namespaceFilter ? `${namespaceFilter} AND ${options.kuery}` : options.kuery;

    const res = await getAgentsByKuery(esClient, soClient, {
      kuery,
      showInactive: options.showInactive ?? false,
      page: 1,
      perPage: batchSize,
    });

    if (res.total <= batchSize) {
      givenAgents = res.agents;
    } else {
      return await new UpgradeActionRunner(
        esClient,
        soClient,
        {
          ...options,
          batchSize,
          total: res.total,
          spaceId: currentSpaceId,
        },
        { pitId: await openPointInTime(esClient) }
      ).runActionAsyncWithRetry();
    }
  }

  return await upgradeBatch(esClient, givenAgents, outgoingErrors, options, currentSpaceId);
}
