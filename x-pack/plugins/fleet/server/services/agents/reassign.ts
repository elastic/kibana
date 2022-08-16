/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import Boom from '@hapi/boom';

import uuid from 'uuid';

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';

import type { Agent, BulkActionResult } from '../../types';
import { appContextService } from '..';
import { agentPolicyService } from '../agent_policy';
import { AgentReassignmentError, HostedAgentPolicyRestrictionRelatedError } from '../../errors';

import { SO_SEARCH_LIMIT } from '../../constants';

import {
  getAgentDocuments,
  getAgentPolicyForAgent,
  updateAgent,
  bulkUpdateAgents,
  processAgentsInBatches,
  errorsToResults,
  openPointInTime,
  getAgentsByKuery,
} from './crud';
import type { GetAgentsOptions } from '.';
import { createAgentAction } from './actions';
import { searchHitToAgent } from './helpers';
import { getHostedPolicies, isHostedAgent } from './hosted_agent';

import { BulkActionTaskType } from './bulk_actions_resolver';

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

  await updateAgent(esClient, agentId, {
    policy_id: newAgentPolicyId,
    policy_revision: null,
  });

  await createAgentAction(esClient, {
    agents: [agentId],
    created_at: new Date().toISOString(),
    type: 'POLICY_REASSIGN',
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
    throw new HostedAgentPolicyRestrictionRelatedError(
      `Cannot reassign an agent from hosted agent policy ${agentPolicy.id}`
    );
  }

  const newAgentPolicy = await agentPolicyService.get(soClient, newAgentPolicyId);
  if (newAgentPolicy?.is_managed) {
    throw new HostedAgentPolicyRestrictionRelatedError(
      `Cannot reassign an agent to hosted agent policy ${newAgentPolicy.id}`
    );
  }

  return true;
}

function isMgetDoc(doc?: estypes.MgetResponseItem<unknown>): doc is estypes.GetGetResult {
  return Boolean(doc && 'found' in doc);
}
export async function reassignAgents(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: ({ agents: Agent[] } | GetAgentsOptions) & {
    force?: boolean;
    batchSize?: number;
    totalAgents?: number;
  },
  newAgentPolicyId: string
): Promise<{ items: BulkActionResult[]; taskId?: string }> {
  const newAgentPolicy = await agentPolicyService.get(soClient, newAgentPolicyId);
  if (!newAgentPolicy) {
    throw Boom.notFound(`Agent policy not found: ${newAgentPolicyId}`);
  }
  if (newAgentPolicy.is_managed) {
    throw new HostedAgentPolicyRestrictionRelatedError(
      `Cannot reassign an agent to hosted agent policy ${newAgentPolicy.id}`
    );
  }

  const outgoingErrors: Record<Agent['id'], Error> = {};
  let givenAgents: Agent[] = [];
  if ('agents' in options) {
    givenAgents = options.agents;
  } else if ('agentIds' in options) {
    const givenAgentsResults = await getAgentDocuments(esClient, options.agentIds);
    for (const agentResult of givenAgentsResults) {
      if (isMgetDoc(agentResult) && agentResult.found === false) {
        outgoingErrors[agentResult._id] = new AgentReassignmentError(
          `Cannot find agent ${agentResult._id}`
        );
      } else {
        givenAgents.push(searchHitToAgent(agentResult));
      }
    }
  } else if ('kuery' in options) {
    if ((options.totalAgents ?? 0) > (options.batchSize ?? SO_SEARCH_LIMIT)) {
      return await runReassignAsync(soClient, esClient, options, newAgentPolicyId);
    } else {
      const res = await getAgentsByKuery(esClient, {
        kuery: options.kuery,
        showInactive: options.showInactive ?? false,
        page: 1,
        perPage: options.batchSize,
      });
      givenAgents = res.agents;
    }
  }

  return await reassignBatch(
    soClient,
    esClient,
    { newAgentPolicyId },
    givenAgents,
    outgoingErrors,
    'agentIds' in options ? options.agentIds : undefined
  );
}

async function runReassignAsync(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: {
    kuery: string;
    showInactive?: boolean;
    force?: boolean;
    batchSize?: number;
    totalAgents?: number;
  },
  newAgentPolicyId: string
) {
  const pitId = await openPointInTime(esClient);
  const actionId = uuid();

  let lastSearchAfter: SortResults | undefined;

  appContextService
    .getLogger()
    .info(
      `Running reassign asynchronously, actionId: ${actionId}, total agents: ${options.totalAgents}`
    );

  const outgoingErrors: Record<Agent['id'], Error> = {};
  processAgentsInBatches(
    esClient,
    {
      kuery: options.kuery,
      showInactive: options.showInactive ?? false,
      batchSize: options.batchSize,
      pitId,
    },
    async (agents: Agent[], skipSuccess: boolean, searchAfter?: SortResults, total?: number) => {
      lastSearchAfter = searchAfter;
      return await reassignBatch(
        soClient,
        esClient,
        { newAgentPolicyId, actionId },
        agents,
        outgoingErrors,
        undefined,
        skipSuccess,
        total
      );
    }
  ).catch(async (error) => {
    appContextService.getLogger().error(`Reassign in batches failed: ${error.message}`);

    const taskId = await appContextService.getBulkActionsResolver()!.run(
      {
        ...options,
        actionId,
        newAgentPolicyId,
        pitId,
        searchAfter: lastSearchAfter,
        retryCount: 1,
      },
      BulkActionTaskType.REASSIGN_RETRY
    );

    appContextService.getLogger().info(`Retrying in task: ${taskId}`);
  });

  return { items: [] };
}

export async function reassignBatch(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: {
    newAgentPolicyId: string;
    actionId?: string;
  },
  givenAgents: Agent[],
  outgoingErrors: Record<Agent['id'], Error>,
  agentIds?: string[],
  skipSuccess?: boolean,
  total?: number
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
    total,
  });

  return result;
}
