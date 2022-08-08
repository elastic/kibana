/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type { Agent, BulkActionResult } from '../../types';
import { invalidateAPIKeys } from '../api_keys';
import { HostedAgentPolicyRestrictionRelatedError } from '../../errors';

import { createAgentAction } from './actions';
import type { GetAgentsOptions } from './crud';
import { errorsToResults } from './crud';
import {
  getAgentById,
  getAgents,
  updateAgent,
  getAgentPolicyForAgent,
  bulkUpdateAgents,
  processAgentsInBatches,
} from './crud';
import { getHostedPolicies, isHostedAgent } from './hosted_agent';

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
    return forceUnenrollAgent(soClient, esClient, agentId);
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
  }
): Promise<{ items: BulkActionResult[] }> {
  if ('agentIds' in options) {
    const givenAgents = await getAgents(esClient, options);
    return await unenrollBatch(soClient, esClient, givenAgents, options);
  }
  return await processAgentsInBatches(
    esClient,
    {
      kuery: options.kuery,
      showInactive: options.showInactive ?? false,
      batchSize: options.batchSize,
    },
    async (agents: Agent[], skipSuccess?: boolean) =>
      await unenrollBatch(soClient, esClient, agents, options, skipSuccess)
  );
}

async function unenrollBatch(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  givenAgents: Agent[],
  options: {
    force?: boolean;
    revoke?: boolean;
  },
  skipSuccess?: boolean
): Promise<{ items: BulkActionResult[] }> {
  // Filter to those not already unenrolled, or unenrolling
  const agentsEnrolled = givenAgents.filter((agent) => {
    if (options.revoke) {
      return !agent.unenrolled_at;
    }
    return !agent.unenrollment_started_at && !agent.unenrolled_at;
  });

  const hostedPolicies = await getHostedPolicies(soClient, agentsEnrolled);

  const outgoingErrors: Record<Agent['id'], Error> = {};

  // And which are allowed to unenroll
  const agentsToUpdate = options.force
    ? agentsEnrolled
    : agentsEnrolled.reduce<Agent[]>((agents, agent, index) => {
        if (isHostedAgent(hostedPolicies, agent)) {
          const id = givenAgents[index].id;
          outgoingErrors[id] = new HostedAgentPolicyRestrictionRelatedError(
            `Cannot unenroll ${agent.id} from a hosted agent policy ${agent.policy_id}`
          );
        } else {
          agents.push(agent);
        }
        return agents;
      }, []);

  const now = new Date().toISOString();
  if (options.revoke) {
    // Get all API keys that need to be invalidated
    await invalidateAPIKeysForAgents(agentsToUpdate);
  } else {
    // Create unenroll action for each agent
    await createAgentAction(esClient, {
      agents: agentsToUpdate.map((agent) => agent.id),
      created_at: now,
      type: 'UNENROLL',
    });
  }

  // Update the necessary agents
  const updateData = options.revoke
    ? { unenrolled_at: now, active: false }
    : { unenrollment_started_at: now };

  await bulkUpdateAgents(
    esClient,
    agentsToUpdate.map(({ id }) => ({ agentId: id, data: updateData }))
  );

  return {
    items: errorsToResults(givenAgents, outgoingErrors, undefined, skipSuccess),
  };
}

export async function invalidateAPIKeysForAgents(agents: Agent[]) {
  const apiKeys = agents.reduce<string[]>((keys, agent) => {
    if (agent.access_api_key_id) {
      keys.push(agent.access_api_key_id);
    }
    if (agent.default_api_key_id) {
      keys.push(agent.default_api_key_id);
    }
    if (agent.default_api_key_history) {
      agent.default_api_key_history.forEach((apiKey) => keys.push(apiKey.id));
    }
    return keys;
  }, []);

  if (apiKeys.length) {
    await invalidateAPIKeys(apiKeys);
  }
}

export async function forceUnenrollAgent(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentIdOrAgent: string | Agent
) {
  const agent =
    typeof agentIdOrAgent === 'string'
      ? await getAgentById(esClient, agentIdOrAgent)
      : agentIdOrAgent;

  await invalidateAPIKeysForAgents([agent]);
  await updateAgent(esClient, agent.id, {
    active: false,
    unenrolled_at: new Date().toISOString(),
  });
}
