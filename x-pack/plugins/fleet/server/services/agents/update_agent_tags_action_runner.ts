/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';

import { difference, uniq } from 'lodash';

import type { Agent, BulkActionResult } from '../../types';

import { ActionRunner } from './action_runner';

import { errorsToResults, bulkUpdateAgents } from './crud';
import { BulkActionTaskType } from './bulk_actions_resolver';
import { filterHostedPolicies } from './filter_hosted_agents';

export class UpdateAgentTagsActionRunner extends ActionRunner {
  private soClient: SavedObjectsClientContract;
  private tagsToAdd: string[];
  private tagsToRemove: string[];

  constructor(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    options: { tagsToAdd: string[]; tagsToRemove: string[] }
  ) {
    super(esClient);
    this.soClient = soClient;
    this.tagsToAdd = options.tagsToAdd;
    this.tagsToRemove = options.tagsToRemove;
  }

  protected async processAgents(
    agents: Agent[],
    actionId: string,
    total?: number
  ): Promise<{ items: BulkActionResult[] }> {
    return await updateTagsBatch(
      this.soClient,
      this.esClient,
      agents,
      {},
      this.tagsToAdd,
      this.tagsToRemove,
      undefined,
      true
    );
  }

  protected getActionType() {
    return BulkActionTaskType.UPDATE_AGENT_TAGS_RETRY;
  }
}

export async function updateTagsBatch(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  givenAgents: Agent[],
  outgoingErrors: Record<Agent['id'], Error>,
  tagsToAdd: string[],
  tagsToRemove: string[],
  agentIds?: string[],
  skipSuccess?: boolean
): Promise<{ items: BulkActionResult[] }> {
  const errors: Record<Agent['id'], Error> = { ...outgoingErrors };

  const filteredAgents = await filterHostedPolicies(
    soClient,
    givenAgents,
    errors,
    `Cannot modify tags on a hosted agent`
  );

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
    filteredAgents.map((agent) => ({
      agentId: agent.id,
      data: {
        tags: getNewTags(agent),
      },
    }))
  );

  return { items: errorsToResults(filteredAgents, errors, agentIds, skipSuccess) };
}
