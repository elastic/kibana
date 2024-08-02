/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type { Agent } from '../../types';
import { AgentReassignmentError } from '../../errors';

import { SO_SEARCH_LIMIT } from '../../constants';

import { agentsKueryNamespaceFilter, isAgentInNamespace } from '../spaces/agent_namespaces';

import { getCurrentNamespace } from '../spaces/get_current_namespace';

import { getAgentsById, getAgentsByKuery, openPointInTime } from './crud';
import type { GetAgentsOptions } from '.';
import { UpdateAgentTagsActionRunner, updateTagsBatch } from './update_agent_tags_action_runner';

export async function updateAgentTags(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: ({ agents: Agent[] } | GetAgentsOptions) & { batchSize?: number },
  tagsToAdd: string[],
  tagsToRemove: string[]
): Promise<{ actionId: string }> {
  const outgoingErrors: Record<Agent['id'], Error> = {};
  const givenAgents: Agent[] = [];
  const currentNameSpace = getCurrentNamespace(soClient);

  if ('agentIds' in options) {
    const maybeAgents = await getAgentsById(esClient, soClient, options.agentIds);
    for (const maybeAgent of maybeAgents) {
      if ('notFound' in maybeAgent) {
        outgoingErrors[maybeAgent.id] = new AgentReassignmentError(
          `Cannot find agent ${maybeAgent.id}`
        );
      } else if (!isAgentInNamespace(maybeAgent, currentNameSpace)) {
        outgoingErrors[maybeAgent.id] = new AgentReassignmentError(
          `Agent ${maybeAgent.id} is not in the current space`
        );
      } else {
        givenAgents.push(maybeAgent);
      }
    }
  } else if ('kuery' in options) {
    const batchSize = options.batchSize ?? SO_SEARCH_LIMIT;

    const namespaceFilter = agentsKueryNamespaceFilter(currentNameSpace);
    const filters = namespaceFilter ? [namespaceFilter] : [];
    if (options.kuery !== '') {
      filters.push(options.kuery);
    }
    if (tagsToAdd.length === 1 && tagsToRemove.length === 0) {
      filters.push(`NOT (tags:${tagsToAdd[0]})`);
    } else if (tagsToRemove.length === 1 && tagsToAdd.length === 0) {
      filters.push(`tags:${tagsToRemove[0]}`);
    }

    const kuery = filters.map((filter) => `(${filter})`).join(' AND ');
    const pitId = await openPointInTime(esClient);

    // calculate total count
    const res = await getAgentsByKuery(esClient, soClient, {
      kuery,
      showInactive: options.showInactive ?? false,
      perPage: 0,
      pitId,
    });

    return await new UpdateAgentTagsActionRunner(
      esClient,
      soClient,
      {
        ...options,
        kuery,
        tagsToAdd,
        tagsToRemove,
        batchSize,
        total: res.total,
      },
      { pitId }
    ).runActionAsyncWithRetry();
  }

  return await updateTagsBatch(soClient, esClient, givenAgents, outgoingErrors, {
    tagsToAdd,
    tagsToRemove,
  });
}
