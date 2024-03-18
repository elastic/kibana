/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';

import type { Agent } from '../../types';
import { agentPolicyService } from '../agent_policy';
import {
  AgentReassignmentError,
  HostedAgentPolicyRestrictionRelatedError,
  AgentPolicyNotFoundError,
} from '../../errors';

import { SO_SEARCH_LIMIT } from '../../constants';

import {
  getAgentsById,
  getAgentPolicyForAgent,
  updateAgent,
  getAgentsByKuery,
  openPointInTime,
} from './crud';
import type { GetAgentsOptions } from '.';
import { createAgentAction } from './actions';

import { ReassignActionRunner, reassignBatch } from './reassign_action_runner';

export async function reassignAgent(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string,
  newAgentPolicyId: string
) {
  const newAgentPolicy = await agentPolicyService.get(soClient, newAgentPolicyId);
  if (!newAgentPolicy) {
    throw new AgentPolicyNotFoundError(`Agent policy not found: ${newAgentPolicyId}`);
  }

  await reassignAgentIsAllowed(soClient, esClient, agentId, newAgentPolicyId);

  await updateAgent(esClient, agentId, {
    policy_id: newAgentPolicyId,
    policy_revision: null,
  });

  await createAgentAction(esClient, {
    agents: [agentId],
    created_at: new Date().toISOString(),
    type: 'POLICY_REASSIGN',
    data: {
      policy_id: newAgentPolicyId,
    },
  });
}

export async function reassignAgentIsAllowed(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string,
  newAgentPolicyId: string
) {
  const agentPolicy = await getAgentPolicyForAgent(soClient, esClient, agentId);
  if (agentPolicy?.is_managed) {
    throw new HostedAgentPolicyRestrictionRelatedError(
      `Cannot reassign an agent from hosted agent policy ${agentPolicy.id}`
    );
  }

  const newAgentPolicy = await agentPolicyService.get(soClient, newAgentPolicyId);
  if (newAgentPolicy?.is_managed) {
    throw new HostedAgentPolicyRestrictionRelatedError(
      `Cannot reassign an agent to hosted agent policy ${newAgentPolicy.id}`
    );
  }

  return true;
}

export async function reassignAgents(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: ({ agents: Agent[] } | GetAgentsOptions) & {
    force?: boolean;
    batchSize?: number;
  },
  newAgentPolicyId: string
): Promise<{ actionId: string }> {
  const newAgentPolicy = await agentPolicyService.get(soClient, newAgentPolicyId);
  if (!newAgentPolicy) {
    throw new AgentPolicyNotFoundError(`Agent policy not found: ${newAgentPolicyId}`);
  }
  if (newAgentPolicy.is_managed) {
    throw new HostedAgentPolicyRestrictionRelatedError(
      `Cannot reassign an agent to hosted agent policy ${newAgentPolicy.id}`
    );
  }

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
    const res = await getAgentsByKuery(esClient, soClient, {
      kuery: options.kuery,
      showInactive: options.showInactive ?? false,
      page: 1,
      perPage: batchSize,
    });
    // running action in async mode for >10k agents (or actions > batchSize for testing purposes)
    if (res.total <= batchSize) {
      givenAgents = res.agents;
    } else {
      return await new ReassignActionRunner(
        esClient,
        soClient,
        {
          ...options,
          batchSize,
          total: res.total,
          newAgentPolicyId,
        },
        { pitId: await openPointInTime(esClient) }
      ).runActionAsyncWithRetry();
    }
  }

  return await reassignBatch(soClient, esClient, { newAgentPolicyId }, givenAgents, outgoingErrors);
}
