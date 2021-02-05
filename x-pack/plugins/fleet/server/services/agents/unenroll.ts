/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import type { AgentSOAttributes } from '../../types';
import { AgentUnenrollmentError } from '../../errors';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import * as APIKeyService from '../api_keys';
import { createAgentAction, bulkCreateAgentActions } from './actions';
import { getAgent, getAgentPolicyForAgent, getAgents, listAllAgents } from './crud';

async function unenrollAgentIsAllowed(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string
) {
  const agentPolicy = await getAgentPolicyForAgent(soClient, esClient, agentId);
  if (agentPolicy?.is_managed) {
    throw new AgentUnenrollmentError(
      `Cannot unenroll ${agentId} from a managed agent policy ${agentPolicy.id}`
    );
  }

  return true;
}

export async function unenrollAgent(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string
) {
  await unenrollAgentIsAllowed(soClient, esClient, agentId);

  const now = new Date().toISOString();
  await createAgentAction(soClient, {
    agent_id: agentId,
    created_at: now,
    type: 'UNENROLL',
  });
  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentId, {
    unenrollment_started_at: now,
  });
}

export async function unenrollAgents(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options:
    | {
        agentIds: string[];
      }
    | {
        kuery: string;
      }
) {
  const agents =
    'agentIds' in options
      ? await getAgents(soClient, options.agentIds)
      : (
          await listAllAgents(soClient, esClient, {
            kuery: options.kuery,
            showInactive: false,
          })
        ).agents;

  // Filter to agents that are not already unenrolled, or unenrolling
  const agentsEnrolled = agents.filter(
    (agent) => !agent.unenrollment_started_at && !agent.unenrolled_at
  );
  // And which are allowed to unenroll
  const settled = await Promise.allSettled(
    agentsEnrolled.map((agent) =>
      unenrollAgentIsAllowed(soClient, esClient, agent.id).then((_) => agent)
    )
  );
  const agentsToUpdate = agentsEnrolled.filter((_, index) => settled[index].status === 'fulfilled');

  const now = new Date().toISOString();

  // Create unenroll action for each agent
  await bulkCreateAgentActions(
    soClient,
    agentsToUpdate.map((agent) => ({
      agent_id: agent.id,
      created_at: now,
      type: 'UNENROLL',
    }))
  );

  // Update the necessary agents
  return await soClient.bulkUpdate<AgentSOAttributes>(
    agentsToUpdate.map((agent) => ({
      type: AGENT_SAVED_OBJECT_TYPE,
      id: agent.id,
      attributes: {
        unenrollment_started_at: now,
      },
    }))
  );
}

export async function forceUnenrollAgent(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string
) {
  const agent = await getAgent(soClient, esClient, agentId);

  await Promise.all([
    agent.access_api_key_id
      ? APIKeyService.invalidateAPIKeys(soClient, [agent.access_api_key_id])
      : undefined,
    agent.default_api_key_id
      ? APIKeyService.invalidateAPIKeys(soClient, [agent.default_api_key_id])
      : undefined,
  ]);

  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentId, {
    active: false,
    unenrolled_at: new Date().toISOString(),
  });
}

export async function forceUnenrollAgents(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options:
    | {
        agentIds: string[];
      }
    | {
        kuery: string;
      }
) {
  // Filter to agents that are not already unenrolled
  const agents =
    'agentIds' in options
      ? await getAgents(soClient, options.agentIds)
      : (
          await listAllAgents(soClient, esClient, {
            kuery: options.kuery,
            showInactive: false,
          })
        ).agents;
  const agentsToUpdate = agents.filter((agent) => !agent.unenrolled_at);
  const now = new Date().toISOString();
  const apiKeys: string[] = [];

  // Get all API keys that need to be invalidated
  agentsToUpdate.forEach((agent) => {
    if (agent.access_api_key_id) {
      apiKeys.push(agent.access_api_key_id);
    }
    if (agent.default_api_key_id) {
      apiKeys.push(agent.default_api_key_id);
    }
  });

  // Invalidate all API keys
  if (apiKeys.length) {
    APIKeyService.invalidateAPIKeys(soClient, apiKeys);
  }

  // Update the necessary agents
  return await soClient.bulkUpdate<AgentSOAttributes>(
    agentsToUpdate.map((agent) => ({
      type: AGENT_SAVED_OBJECT_TYPE,
      id: agent.id,
      attributes: {
        active: false,
        unenrolled_at: now,
      },
    }))
  );
}
