/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import uuid from 'uuid';
import { difference, uniq } from 'lodash';

import type { Agent, BulkActionResult } from '../../types';

import { appContextService } from '../app_context';

import { ActionRunner } from './action_runner';

import { errorsToResults, bulkUpdateAgents } from './crud';
import { BulkActionTaskType } from './bulk_actions_resolver';
import { filterHostedPolicies } from './filter_hosted_agents';
import { bulkCreateAgentActionResults, createAgentAction } from './actions';

export class UpdateAgentTagsActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ items: BulkActionResult[] }> {
    return await updateTagsBatch(
      this.soClient,
      this.esClient,
      agents,
      {},
      {
        tagsToAdd: this.actionParams?.tagsToAdd,
        tagsToRemove: this.actionParams?.tagsToRemove,
        actionId: this.actionParams.actionId,
        total: this.actionParams.total,
      },
      undefined,
      true
    );
  }

  protected getTaskType() {
    return BulkActionTaskType.UPDATE_AGENT_TAGS_RETRY;
  }

  protected getActionType() {
    return 'UPDATE_TAGS';
  }
}

export async function updateTagsBatch(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  givenAgents: Agent[],
  outgoingErrors: Record<Agent['id'], Error>,
  options: {
    tagsToAdd: string[];
    tagsToRemove: string[];
    actionId?: string;
    total?: number;
  },
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

    if (options.tagsToAdd.length === 1 && options.tagsToRemove.length === 1) {
      const removableTagIndex = existingTags.indexOf(options.tagsToRemove[0]);
      if (removableTagIndex > -1) {
        const newTags = uniq([
          ...existingTags.slice(0, removableTagIndex),
          options.tagsToAdd[0],
          ...existingTags.slice(removableTagIndex + 1),
        ]);
        return newTags;
      }
    }
    return uniq(difference(existingTags, options.tagsToRemove).concat(options.tagsToAdd));
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

  const actionId = options.actionId ?? uuid();
  const total = options.total ?? givenAgents.length;
  const errorCount = Object.keys(errors).length;

  // creating an action doc so that update tags  shows up in activity
  await createAgentAction(esClient, {
    id: actionId,
    agents: [],
    created_at: new Date().toISOString(),
    type: 'UPDATE_TAGS',
    total,
  });
  await bulkCreateAgentActionResults(
    esClient,
    filteredAgents.map((agent) => ({
      agentId: agent.id,
      actionId,
    }))
  );

  if (errorCount > 0) {
    appContextService
      .getLogger()
      .info(
        `Skipping ${errorCount} agents, as failed validation (cannot modified tags on hosted agents)`
      );

    // writing out error result for those agents that failed validation, so the action is not going to stay in progress forever
    await bulkCreateAgentActionResults(
      esClient,
      Object.keys(errors).map((agentId) => ({
        agentId,
        actionId,
        error: errors[agentId].message,
      }))
    );
  }

  return { items: errorsToResults(filteredAgents, errors, agentIds, skipSuccess) };
}
