/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type { Agent } from '../../types';
import { AgentReassignmentError } from '../../errors';

import { getAgentDocuments } from './crud';
import type { GetAgentsOptions } from '.';
import { searchHitToAgent } from './helpers';
import { UpdateAgentTagsActionRunner, updateTagsBatch } from './update_agent_tags_action_runner';

function isMgetDoc(doc?: estypes.MgetResponseItem<unknown>): doc is estypes.GetGetResult {
  return Boolean(doc && 'found' in doc);
}

export async function updateAgentTags(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: ({ agents: Agent[] } | GetAgentsOptions) & { batchSize?: number },
  tagsToAdd: string[],
  tagsToRemove: string[]
): Promise<{ actionId: string }> {
  const outgoingErrors: Record<Agent['id'], Error> = {};
  const givenAgents: Agent[] = [];

  if ('agentIds' in options) {
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
    return await new UpdateAgentTagsActionRunner(
      esClient,
      soClient,
      {
        ...options,
        kuery: options.kuery,
        tagsToAdd,
        tagsToRemove,
      },
      { pitId: '' }
    ).runActionAsyncWithRetry();
  }

  return await updateTagsBatch(soClient, esClient, givenAgents, outgoingErrors, {
    tagsToAdd,
    tagsToRemove,
  });
}
