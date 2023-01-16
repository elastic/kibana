/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import uuid from 'uuid';
import { uniq } from 'lodash';

import type { Agent } from '../../types';

import { AGENTS_INDEX } from '../../constants';

import { appContextService } from '../app_context';

import { ActionRunner } from './action_runner';

import { BulkActionTaskType } from './bulk_action_types';
import { filterHostedPolicies } from './filter_hosted_agents';
import { bulkCreateAgentActionResults, createAgentAction } from './actions';
import { MAX_RETRY_COUNT } from './retry_helper';

export class UpdateAgentTagsActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
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
      }
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
    kuery?: string;
    retryCount?: number;
  }
): Promise<{ actionId: string; updated?: number; took?: number }> {
  const errors: Record<Agent['id'], Error> = { ...outgoingErrors };
  const hostedAgentError = `Cannot modify tags on a hosted agent`;

  const filteredAgents = await filterHostedPolicies(
    soClient,
    givenAgents,
    errors,
    hostedAgentError
  );
  const agentIds = filteredAgents.map((agent) => agent.id);

  const actionId = options.actionId ?? uuid();
  if (agentIds.length === 0) {
    appContextService.getLogger().debug('No agents to update tags, returning');
    return { actionId, updated: 0, took: 0 };
  }

  appContextService
    .getLogger()
    .debug(
      `Agents to update tags in batch: ${agentIds.length}, tagsToAdd: ${options.tagsToAdd}, tagsToRemove: ${options.tagsToRemove}`
    );

  let res;
  try {
    res = await esClient.updateByQuery({
      query: {
        terms: {
          _id: agentIds,
        },
      },
      index: AGENTS_INDEX,
      refresh: true,
      wait_for_completion: true,
      script: {
        source: `   
      if (ctx._source.tags == null) {
        ctx._source.tags = [];
      }
      if (params.tagsToAdd.length == 1 && params.tagsToRemove.length == 1) { 
        ctx._source.tags.replaceAll(tag -> params.tagsToRemove[0] == tag ? params.tagsToAdd[0] : tag);
      } else {
        ctx._source.tags.removeAll(params.tagsToRemove);
      } 
      ctx._source.tags.addAll(params.tagsToAdd);

      LinkedHashSet uniqueSet = new LinkedHashSet();
      uniqueSet.addAll(ctx._source.tags);

      ctx._source.tags = uniqueSet.toArray();

      ctx._source.updated_at = params.updatedAt;
      `,
        lang: 'painless',
        params: {
          tagsToAdd: uniq(options.tagsToAdd),
          tagsToRemove: uniq(options.tagsToRemove),
          updatedAt: new Date().toISOString(),
        },
      },
      conflicts: 'proceed', // relying on the task to retry in case of conflicts - retry only conflicted agents
    });
  } catch (error) {
    throw new Error('Caught error: ' + JSON.stringify(error).slice(0, 1000));
  }

  appContextService.getLogger().debug(JSON.stringify(res).slice(0, 1000));

  if (options.retryCount === undefined) {
    // creating an action doc so that update tags  shows up in activity
    await createAgentAction(esClient, {
      id: actionId,
      agents: agentIds,
      created_at: new Date().toISOString(),
      type: 'UPDATE_TAGS',
      total: options.total ?? res.total,
    });
  }

  // creating unique ids to use as agentId, as we don't have all agent ids in case of action by kuery
  const getUuidArray = (count: number) => Array.from({ length: count }, () => uuid());

  // writing successful action results
  if (res.updated ?? 0 > 0) {
    await bulkCreateAgentActionResults(
      esClient,
      agentIds.map((id) => ({
        agentId: id,
        actionId,
      }))
    );
  }

  // writing failures from es update
  if (res.failures && res.failures.length > 0) {
    await bulkCreateAgentActionResults(
      esClient,
      res.failures.map((failure) => ({
        agentId: failure.id,
        actionId,
        error: failure.cause.reason,
      }))
    );
  }

  if (res.version_conflicts ?? 0 > 0) {
    // write out error results on last retry, so action is not stuck in progress
    if (options.retryCount === MAX_RETRY_COUNT) {
      await bulkCreateAgentActionResults(
        esClient,
        getUuidArray(res.version_conflicts!).map((id) => ({
          agentId: id,
          actionId,
          error: 'version conflict on last retry',
        }))
      );
    }
    throw new Error(`version conflict of ${res.version_conflicts} agents`);
  }

  return { actionId, updated: res.updated, took: res.took };
}
