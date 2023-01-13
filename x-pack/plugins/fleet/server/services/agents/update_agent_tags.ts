/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type { Agent } from '../../types';
import { AgentReassignmentError } from '../../errors';

import { getAgentsById } from './crud';
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

  if ('agentIds' in options) {
    const maybeAgents = await getAgentsById(esClient, soClient, options.agentIds);
    for (const maybeAgent of maybeAgents) {
      if ('notFound' in maybeAgent) {
        outgoingErrors[maybeAgent.id] = new AgentReassignmentError(
          `Cannot find agent ${maybeAgent.id}`
        );
      } else {
        givenAgents.push(maybeAgent);
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
