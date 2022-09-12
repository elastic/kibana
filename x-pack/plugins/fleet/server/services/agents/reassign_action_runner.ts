/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';

import type { Agent, BulkActionResult } from '../../types';

import { AgentReassignmentError, HostedAgentPolicyRestrictionRelatedError } from '../../errors';

import { appContextService } from '../app_context';

import { ActionRunner } from './action_runner';

import { errorsToResults, bulkUpdateAgents } from './crud';
import { createAgentAction } from './actions';
import { getHostedPolicies, isHostedAgent } from './hosted_agent';
import { BulkActionTaskType } from './bulk_actions_resolver';

export class ReassignActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ items: BulkActionResult[] }> {
    return await reassignBatch(
      this.soClient,
      this.esClient,
      this.actionParams! as any,
      agents,
      {},
      undefined,
      true
    );
  }

  protected getTaskType() {
    return BulkActionTaskType.REASSIGN_RETRY;
  }

  protected getActionType() {
    return 'POLICY_REASSIGN';
  }
}

export async function reassignBatch(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: {
    newAgentPolicyId: string;
    actionId?: string;
    total?: number;
  },
  givenAgents: Agent[],
  outgoingErrors: Record<Agent['id'], Error>,
  agentIds?: string[],
  skipSuccess?: boolean
): Promise<{ items: BulkActionResult[] }> {
  const errors: Record<Agent['id'], Error> = { ...outgoingErrors };

  const hostedPolicies = await getHostedPolicies(soClient, givenAgents);

  // which are allowed to unenroll
  const agentResults = await Promise.allSettled(
    givenAgents.map(async (agent, index) => {
      if (agent.policy_id === options.newAgentPolicyId) {
        throw new AgentReassignmentError(
          `${agent.id} is already assigned to ${options.newAgentPolicyId}`
        );
      }

      if (isHostedAgent(hostedPolicies, agent)) {
        throw new HostedAgentPolicyRestrictionRelatedError(
          `Cannot reassign an agent from hosted agent policy ${agent.policy_id}`
        );
      }

      return agent;
    })
  );

  // Filter to agents that do not already use the new agent policy ID
  const agentsToUpdate = agentResults.reduce<Agent[]>((agents, result, index) => {
    if (result.status === 'fulfilled') {
      agents.push(result.value);
    } else {
      const id = givenAgents[index].id;
      errors[id] = result.reason;
    }
    return agents;
  }, []);

  const result = { items: errorsToResults(givenAgents, errors, agentIds, skipSuccess) };

  if (agentsToUpdate.length === 0) {
    // early return if all agents failed validation
    appContextService
      .getLogger()
      .debug('No agents to update, skipping agent update and action creation');
    return result;
  }

  await bulkUpdateAgents(
    esClient,
    agentsToUpdate.map((agent) => ({
      agentId: agent.id,
      data: {
        policy_id: options.newAgentPolicyId,
        policy_revision: null,
      },
    }))
  );

  const now = new Date().toISOString();
  await createAgentAction(esClient, {
    id: options.actionId,
    agents: agentsToUpdate.map((agent) => agent.id),
    created_at: now,
    type: 'POLICY_REASSIGN',
    total: options.total,
    data: {
      policy_id: options.newAgentPolicyId,
    },
  });

  return result;
}
