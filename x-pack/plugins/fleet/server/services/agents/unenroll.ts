/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';

import * as APIKeyService from '../api_keys';
import { AgentUnenrollmentError } from '../../errors';

import { createAgentAction, bulkCreateAgentActions } from './actions';
import type { GetAgentsOptions } from './crud';
import {
  getAgentById,
  getAgents,
  updateAgent,
  getAgentPolicyForAgent,
  bulkUpdateAgents,
} from './crud';

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
  await createAgentAction(soClient, esClient, {
    agent_id: agentId,
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
  options: GetAgentsOptions & { force?: boolean }
) {
  // start with all agents specified
  const agents = await getAgents(esClient, options);

  // Filter to those not already unenrolled, or unenrolling
  const agentsEnrolled = agents.filter((agent) => {
    if (options.force) {
      return !agent.unenrolled_at;
    }
    return !agent.unenrollment_started_at && !agent.unenrolled_at;
  });
  // And which are allowed to unenroll
  const settled = await Promise.allSettled(
    agentsEnrolled.map((agent) =>
      unenrollAgentIsAllowed(soClient, esClient, agent.id).then((_) => agent)
    )
  );
  const agentsToUpdate = agentsEnrolled.filter((_, index) => settled[index].status === 'fulfilled');
  const now = new Date().toISOString();

  if (options.force) {
    // Get all API keys that need to be invalidated
    const apiKeys = agentsToUpdate.reduce<string[]>((keys, agent) => {
      if (agent.access_api_key_id) {
        keys.push(agent.access_api_key_id);
      }
      if (agent.default_api_key_id) {
        keys.push(agent.default_api_key_id);
      }

      return keys;
    }, []);

    // Invalidate all API keys
    if (apiKeys.length) {
      await APIKeyService.invalidateAPIKeys(soClient, apiKeys);
    }
    // Update the necessary agents
    return bulkUpdateAgents(
      esClient,
      agentsToUpdate.map((agent) => ({
        agentId: agent.id,
        data: {
          active: false,
          unenrolled_at: now,
        },
      }))
    );
  } else {
    // Create unenroll action for each agent
    await bulkCreateAgentActions(
      soClient,
      esClient,
      agentsToUpdate.map((agent) => ({
        agent_id: agent.id,
        created_at: now,
        type: 'UNENROLL',
      }))
    );

    // Update the necessary agents
    return bulkUpdateAgents(
      esClient,
      agentsToUpdate.map((agent) => ({
        agentId: agent.id,
        data: {
          unenrollment_started_at: now,
        },
      }))
    );
  }
}

export async function forceUnenrollAgent(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string
) {
  const agent = await getAgentById(esClient, agentId);

  await Promise.all([
    agent.access_api_key_id
      ? APIKeyService.invalidateAPIKeys(soClient, [agent.access_api_key_id])
      : undefined,
    agent.default_api_key_id
      ? APIKeyService.invalidateAPIKeys(soClient, [agent.default_api_key_id])
      : undefined,
  ]);

  await updateAgent(esClient, agentId, {
    active: false,
    unenrolled_at: new Date().toISOString(),
  });
}
