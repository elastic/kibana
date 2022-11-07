/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import uuid from 'uuid';
import { uniq } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { Agent } from '../../types';

import { AGENTS_INDEX, AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../constants';

import { appContextService } from '..';

import { agentPolicyService } from '../agent_policy';

import { ActionRunner } from './action_runner';

import { BulkActionTaskType } from './bulk_actions_resolver';
import { filterHostedPolicies } from './filter_hosted_agents';
import {
  createErrorActionResults,
  bulkCreateAgentActionResults,
  createAgentAction,
} from './actions';
import { getElasticsearchQuery } from './crud';

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

  async processAgentsInBatches(): Promise<{ actionId: string }> {
    const { updated, took } = await updateTagsBatch(
      this.soClient,
      this.esClient,
      [],
      {},
      {
        tagsToAdd: this.actionParams?.tagsToAdd,
        tagsToRemove: this.actionParams?.tagsToRemove,
        actionId: this.actionParams.actionId,
        total: this.actionParams.total,
        kuery: this.actionParams.kuery,
      }
    );

    appContextService.getLogger().info(`processed ${updated} agents, took ${took}ms`);
    return { actionId: this.actionParams.actionId! };
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

  let query: estypes.QueryDslQueryContainer | undefined;
  if (options.kuery !== undefined) {
    const hostedPolicies = await agentPolicyService.list(soClient, {
      kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.is_managed:true`,
    });
    const hostedIds = hostedPolicies.items.map((item) => item.id);

    query = getElasticsearchQuery(options.kuery, false, false, hostedIds);
  } else {
    query = {
      terms: {
        _id: agentIds,
      },
    };
  }

  let res;
  try {
    res = await esClient.updateByQuery({
      query,
      index: AGENTS_INDEX,
      refresh: true,
      wait_for_completion: true,
      script: {
        source: `   
      ctx._source.tags = ctx._source.tags == null ? [] : ctx._source.tags;
      if (params.tagsToAdd.length == 1 && params.tagsToRemove.length == 1) { 
        ctx._source.tags.replaceAll(tag -> params.tagsToRemove[0] == tag ? params.tagsToAdd[0] : tag);
      } else {
        ctx._source.tags.removeAll(params.tagsToRemove); 
        ctx._source.tags.addAll(params.tagsToAdd);
      } 

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
      conflicts: 'abort', // relying on the task to retry in case of conflicts
    });
  } catch (error) {
    throw new Error('Caught error: ' + JSON.stringify(error).slice(0, 1000));
  }

  appContextService.getLogger().debug(JSON.stringify(res).slice(0, 1000));

  const actionId = options.actionId ?? uuid();
  const total = options.total ?? givenAgents.length;

  // creating an action doc so that update tags  shows up in activity
  await createAgentAction(esClient, {
    id: actionId,
    agents: options.kuery !== undefined ? [] : agentIds,
    created_at: new Date().toISOString(),
    type: 'UPDATE_TAGS',
    total,
  });
  // writing action errors from errors map (applicable if agentIds were checked for hosted agent)
  await createErrorActionResults(esClient, actionId, errors, hostedAgentError);

  // writing successful action results
  if (res.updated ?? 0 > 0) {
    await bulkCreateAgentActionResults(
      esClient,
      (options.kuery !== undefined ? Array(res.updated).fill('') : agentIds).map((agentId) => ({
        agentId,
        actionId,
      }))
    );
  }

  // writing failures from es update
  if (res.failures && res.failures.length > 0) {
    await bulkCreateAgentActionResults(
      esClient,
      res.failures.map((failure) => ({
        agentId: '',
        actionId,
        error: failure.cause.reason,
      }))
    );
  }

  // writing hosted agent errors - hosted agents filtered out when kuery is passed
  if (res.total ?? total < total) {
    await bulkCreateAgentActionResults(
      esClient,
      Array(total - (res.total ?? total))
        .fill('')
        .map(() => ({
          agentId: '',
          actionId,
          error: hostedAgentError,
        }))
    );
  }

  return { actionId, updated: res.updated, took: res.took };
}
