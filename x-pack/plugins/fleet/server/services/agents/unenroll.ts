/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';

import type { Agent, BulkActionResult } from '../../types';
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
): Promise<{ items: BulkActionResult[] }> {
  // start with all agents specified
  const givenAgents = await getAgents(esClient, options);
  const outgoingErrors: Record<Agent['id'], Error> = {};

  // Filter to those not already unenrolled, or unenrolling
  const agentsEnrolled = givenAgents.filter((agent) => {
    if (options.force) {
      return !agent.unenrolled_at;
    }
    return !agent.unenrollment_started_at && !agent.unenrolled_at;
  });
  // And which are allowed to unenroll
  const agentResults = await Promise.allSettled(
    agentsEnrolled.map((agent) =>
      unenrollAgentIsAllowed(soClient, esClient, agent.id).then((_) => agent)
    )
  );
  const agentsToUpdate = agentResults.reduce<Agent[]>((agents, result, index) => {
    if (result.status === 'fulfilled') {
      agents.push(result.value);
    } else {
      const id = givenAgents[index].id;
      outgoingErrors[id] = result.reason;
    }
    return agents;
  }, []);

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
      await APIKeyService.invalidateAPIKeys(apiKeys);
    }
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
  }

  // Update the necessary agents
  const updateData = options.force
    ? { unenrolled_at: now, active: false }
    : { unenrollment_started_at: now };

  await bulkUpdateAgents(
    esClient,
    agentsToUpdate.map(({ id }) => ({ agentId: id, data: updateData }))
  );

  const out = {
    items: givenAgents.map((agent, index) => {
      const hasError = agent.id in outgoingErrors;
      const result: BulkActionResult = {
        id: agent.id,
        success: !hasError,
      };
      if (hasError) {
        result.error = outgoingErrors[agent.id];
      }
      return result;
    }),
  };
  return out;
}

export async function forceUnenrollAgent(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string
) {
  const agent = await getAgentById(esClient, agentId);

  await Promise.all([
    agent.access_api_key_id
      ? APIKeyService.invalidateAPIKeys([agent.access_api_key_id])
      : undefined,
    agent.default_api_key_id
      ? APIKeyService.invalidateAPIKeys([agent.default_api_key_id])
      : undefined,
  ]);

  await updateAgent(esClient, agentId, {
    active: false,
    unenrolled_at: new Date().toISOString(),
  });
}
