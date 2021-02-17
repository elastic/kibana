/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from 'kibana/server';
import Boom from '@hapi/boom';
import { agentPolicyService } from '../agent_policy';
import {
  getAgents,
  getAgentPolicyForAgent,
  listAllAgents,
  updateAgent,
  bulkUpdateAgents,
} from './crud';
import { AgentReassignmentError } from '../../errors';

import { createAgentAction, bulkCreateAgentActions } from './actions';

export async function reassignAgent(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string,
  newAgentPolicyId: string
) {
  const newAgentPolicy = await agentPolicyService.get(soClient, newAgentPolicyId);
  if (!newAgentPolicy) {
    throw Boom.notFound(`Agent policy not found: ${newAgentPolicyId}`);
  }

  await reassignAgentIsAllowed(soClient, esClient, agentId, newAgentPolicyId);

  await updateAgent(soClient, esClient, agentId, {
    policy_id: newAgentPolicyId,
    policy_revision: null,
  });

  await createAgentAction(soClient, esClient, {
    agent_id: agentId,
    created_at: new Date().toISOString(),
    type: 'INTERNAL_POLICY_REASSIGN',
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
    throw new AgentReassignmentError(
      `Cannot reassign an agent from managed agent policy ${agentPolicy.id}`
    );
  }

  const newAgentPolicy = await agentPolicyService.get(soClient, newAgentPolicyId);
  if (newAgentPolicy?.is_managed) {
    throw new AgentReassignmentError(
      `Cannot reassign an agent to managed agent policy ${newAgentPolicy.id}`
    );
  }

  return true;
}

export async function reassignAgents(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options:
    | {
        agentIds: string[];
      }
    | {
        kuery: string;
      },
  newAgentPolicyId: string
): Promise<{ items: Array<{ id: string; sucess: boolean; error?: Error }> }> {
  const agentPolicy = await agentPolicyService.get(soClient, newAgentPolicyId);
  if (!agentPolicy) {
    throw Boom.notFound(`Agent policy not found: ${newAgentPolicyId}`);
  }

  // Filter to agents that do not already use the new agent policy ID
  const agents =
    'agentIds' in options
      ? await getAgents(soClient, esClient, options.agentIds)
      : (
          await listAllAgents(soClient, esClient, {
            kuery: options.kuery,
            showInactive: false,
          })
        ).agents;
  // And which are allowed to unenroll
  const settled = await Promise.allSettled(
    agents.map((agent) =>
      reassignAgentIsAllowed(soClient, esClient, agent.id, newAgentPolicyId).then((_) => agent)
    )
  );
  const agentsToUpdate = agents.filter(
    (agent, index) => settled[index].status === 'fulfilled' && agent.policy_id !== newAgentPolicyId
  );

  const res = await bulkUpdateAgents(
    soClient,
    esClient,
    agentsToUpdate.map((agent) => ({
      agentId: agent.id,
      data: {
        policy_id: newAgentPolicyId,
        policy_revision: null,
      },
    }))
  );

  const now = new Date().toISOString();
  await bulkCreateAgentActions(
    soClient,
    esClient,
    agentsToUpdate.map((agent) => ({
      agent_id: agent.id,
      created_at: now,
      type: 'INTERNAL_POLICY_REASSIGN',
    }))
  );

  return res;
}
