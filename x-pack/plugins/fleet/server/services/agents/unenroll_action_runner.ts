/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';

import type { Agent, BulkActionResult } from '../../types';

import { HostedAgentPolicyRestrictionRelatedError } from '../../errors';

import { invalidateAPIKeys } from '../api_keys';

import { ActionRunner } from './action_runner';

import { errorsToResults, bulkUpdateAgents } from './crud';
import { createAgentAction } from './actions';
import { getHostedPolicies, isHostedAgent } from './hosted_agent';
import { BulkActionTaskType } from './bulk_actions_resolver';

export class UnenrollActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ items: BulkActionResult[] }> {
    return await unenrollBatch(this.soClient, this.esClient, agents, this.actionParams!, true);
  }

  protected getTaskType() {
    return BulkActionTaskType.UNENROLL_RETRY;
  }

  protected getActionType() {
    return 'UNENROLL';
  }
}

export async function unenrollBatch(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  givenAgents: Agent[],
  options: {
    force?: boolean;
    revoke?: boolean;
    actionId?: string;
    total?: number;
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
    : agentsEnrolled.reduce<Agent[]>((agents, agent) => {
        if (isHostedAgent(hostedPolicies, agent)) {
          outgoingErrors[agent.id] = new HostedAgentPolicyRestrictionRelatedError(
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
      id: options.actionId,
      agents: agentsToUpdate.map((agent) => agent.id),
      created_at: now,
      type: 'UNENROLL',
      total: options.total,
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
