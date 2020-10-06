/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { chunk } from 'lodash';
import { SavedObjectsClientContract } from 'src/core/server';
import { AgentSOAttributes } from '../../types';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import { getAgent } from './crud';
import * as APIKeyService from '../api_keys';
import { createAgentAction, bulkCreateAgentActions } from './actions';
import { getAgents, listAllAgents } from './crud';

export async function unenrollAgent(soClient: SavedObjectsClientContract, agentId: string) {
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
  options:
    | {
        agentIds: string[];
      }
    | {
        kuery: string;
      }
) {
  // Filter to agents that do not already unenrolled, or unenrolling
  const agents =
    'agentIds' in options
      ? await getAgents(soClient, options.agentIds)
      : (
          await listAllAgents(soClient, {
            kuery: options.kuery,
            showInactive: false,
          })
        ).agents;
  const agentsToUpdate = agents.filter(
    (agent) => !agent.unenrollment_started_at && !agent.unenrolled_at
  );
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

export async function forceUnenrollAgent(soClient: SavedObjectsClientContract, agentId: string) {
  const agent = await getAgent(soClient, agentId);

  await Promise.all([
    agent.access_api_key_id
      ? APIKeyService.invalidateAPIKey(soClient, agent.access_api_key_id)
      : undefined,
    agent.default_api_key_id
      ? APIKeyService.invalidateAPIKey(soClient, agent.default_api_key_id)
      : undefined,
  ]);

  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentId, {
    active: false,
    unenrolled_at: new Date().toISOString(),
  });
}

export async function forceUnenrollAgents(
  soClient: SavedObjectsClientContract,
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
          await listAllAgents(soClient, {
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
  // ES doesn't provide a bulk invalidate API, so this could take a long time depending on
  // number of keys to invalidate. We run these in batches to avoid overloading ES.
  if (apiKeys.length) {
    const BATCH_SIZE = 500;
    const batches = chunk(apiKeys, BATCH_SIZE);
    for (const apiKeysBatch of batches) {
      await Promise.all(
        apiKeysBatch.map((apiKey) => APIKeyService.invalidateAPIKey(soClient, apiKey))
      );
    }
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
