/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import Boom from '@hapi/boom';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import { AgentSOAttributes } from '../../types';
import { agentPolicyService } from '../agent_policy';
import { getAgents, listAllAgents } from './crud';
import { createAgentAction, bulkCreateAgentActions } from './actions';

export async function reassignAgent(
  soClient: SavedObjectsClientContract,
  agentId: string,
  newAgentPolicyId: string
) {
  const agentPolicy = await agentPolicyService.get(soClient, newAgentPolicyId);
  if (!agentPolicy) {
    throw Boom.notFound(`Agent policy not found: ${newAgentPolicyId}`);
  }

  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentId, {
    policy_id: newAgentPolicyId,
    policy_revision: null,
  });

  await createAgentAction(soClient, {
    agent_id: agentId,
    created_at: new Date().toISOString(),
    type: 'INTERNAL_POLICY_REASSIGN',
  });
}

export async function reassignAgents(
  soClient: SavedObjectsClientContract,
  options:
    | {
        agentIds: string[];
      }
    | {
        kuery: string;
      },
  newAgentPolicyId: string
) {
  const agentPolicy = await agentPolicyService.get(soClient, newAgentPolicyId);
  if (!agentPolicy) {
    throw Boom.notFound(`Agent policy not found: ${newAgentPolicyId}`);
  }

  // Filter to agents that do not already use the new agent policy ID
  const agents =
    'agentIds' in options
      ? await getAgents(soClient, options.agentIds)
      : (
          await listAllAgents(soClient, {
            kuery: options.kuery,
            showInactive: false,
          })
        ).agents;
  const agentsToUpdate = agents.filter((agent) => agent.policy_id !== newAgentPolicyId);

  // Update the necessary agents
  const res = await soClient.bulkUpdate<AgentSOAttributes>(
    agentsToUpdate.map((agent) => ({
      type: AGENT_SAVED_OBJECT_TYPE,
      id: agent.id,
      attributes: {
        policy_id: newAgentPolicyId,
        policy_revision: null,
      },
    }))
  );
  const now = new Date().toISOString();
  await bulkCreateAgentActions(
    soClient,
    agentsToUpdate.map((agent) => ({
      agent_id: agent.id,
      created_at: now,
      type: 'INTERNAL_POLICY_REASSIGN',
    }))
  );

  return res;
}
