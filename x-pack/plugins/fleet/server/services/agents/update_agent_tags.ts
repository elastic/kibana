/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference, uniq } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { Agent, BulkActionResult } from '../../types';
import { AgentReassignmentError } from '../../errors';

import {
  getAgentDocuments,
  bulkUpdateAgents,
  processAgentsInBatches,
  errorsToResults,
} from './crud';
import type { GetAgentsOptions } from '.';
import { searchHitToAgent } from './helpers';

function isMgetDoc(doc?: estypes.MgetResponseItem<unknown>): doc is estypes.GetGetResult {
  return Boolean(doc && 'found' in doc);
}

export async function updateAgentTags(
  esClient: ElasticsearchClient,
  options: ({ agents: Agent[] } | GetAgentsOptions) & { batchSize?: number },
  tagsToAdd: string[],
  tagsToRemove: string[]
) {
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
    return await processAgentsInBatches(
      esClient,
      {
        kuery: options.kuery,
        showInactive: true,
        batchSize: options.batchSize,
      },
      async (agents: Agent[], skipSuccess: boolean) =>
        await updateTagsBatch(
          esClient,
          agents,
          outgoingErrors,
          tagsToAdd,
          tagsToRemove,
          undefined,
          skipSuccess
        )
    );
  }

  return await updateTagsBatch(
    esClient,
    givenAgents,
    outgoingErrors,
    tagsToAdd,
    tagsToRemove,
    'agentIds' in options ? options.agentIds : undefined
  );
}

async function updateTagsBatch(
  esClient: ElasticsearchClient,
  givenAgents: Agent[],
  outgoingErrors: Record<Agent['id'], Error>,
  tagsToAdd: string[],
  tagsToRemove: string[],
  agentIds?: string[],
  skipSuccess?: boolean
): Promise<{ items: BulkActionResult[] }> {
  const errors: Record<Agent['id'], Error> = { ...outgoingErrors };

  const getNewTags = (agent: Agent): string[] => {
    const existingTags = agent.tags ?? [];

    if (tagsToAdd.length === 1 && tagsToRemove.length === 1) {
      const removableTagIndex = existingTags.indexOf(tagsToRemove[0]);
      if (removableTagIndex > -1) {
        const newTags = uniq([
          ...existingTags.slice(0, removableTagIndex),
          tagsToAdd[0],
          ...existingTags.slice(removableTagIndex + 1),
        ]);
        return newTags;
      }
    }
    return uniq(difference(existingTags, tagsToRemove).concat(tagsToAdd));
  };

  await bulkUpdateAgents(
    esClient,
    givenAgents.map((agent) => ({
      agentId: agent.id,
      data: {
        tags: getNewTags(agent),
      },
    }))
  );

  return { items: errorsToResults(givenAgents, errors, agentIds, skipSuccess) };
}
