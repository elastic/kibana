/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuid } from 'uuid';
import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';

import type { Agent } from '../../types';

import { AgentReassignmentError, HostedAgentPolicyRestrictionRelatedError } from '../../errors';

import { appContextService } from '../app_context';

import { ActionRunner } from './action_runner';

import { bulkUpdateAgents } from './crud';
import { createErrorActionResults, createAgentAction } from './actions';
import { getHostedPolicies, isHostedAgent } from './hosted_agent';
import { BulkActionTaskType } from './bulk_actions_resolver';

export class ReassignActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    return await reassignBatch(this.soClient, this.esClient, this.actionParams! as any, agents, {});
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
  outgoingErrors: Record<Agent['id'], Error>
): Promise<{ actionId: string }> {
  const errors: Record<Agent['id'], Error> = { ...outgoingErrors };

  const hostedPolicies = await getHostedPolicies(soClient, givenAgents);

  const agentsToUpdate = givenAgents.reduce<Agent[]>((agents, agent) => {
    if (agent.policy_id === options.newAgentPolicyId) {
      errors[agent.id] = new AgentReassignmentError(
        `Agent ${agent.id} is already assigned to agent policy ${options.newAgentPolicyId}`
      );
    } else if (isHostedAgent(hostedPolicies, agent)) {
      errors[agent.id] = new HostedAgentPolicyRestrictionRelatedError(
        `Cannot reassign an agent from hosted agent policy ${agent.policy_id}`
      );
    } else {
      agents.push(agent);
    }
    return agents;
  }, []);

  if (agentsToUpdate.length === 0) {
    // early return if all agents failed validation
    appContextService
      .getLogger()
      .debug('No agents to update, skipping agent update and action creation');
    throw new AgentReassignmentError('No agents to reassign, already assigned or hosted agents');
  }

  await bulkUpdateAgents(
    esClient,
    agentsToUpdate.map((agent) => ({
      agentId: agent.id,
      data: {
        policy_id: options.newAgentPolicyId,
        policy_revision: null,
      },
    })),
    errors
  );

  const actionId = options.actionId ?? uuid();
  const total = options.total ?? givenAgents.length;

  const now = new Date().toISOString();
  await createAgentAction(esClient, {
    id: actionId,
    agents: agentsToUpdate.map((agent) => agent.id),
    created_at: now,
    type: 'POLICY_REASSIGN',
    total,
    data: {
      policy_id: options.newAgentPolicyId,
    },
  });

  await createErrorActionResults(
    esClient,
    actionId,
    errors,
    'already assigned or assigned to hosted policy'
  );

  return { actionId };
}
