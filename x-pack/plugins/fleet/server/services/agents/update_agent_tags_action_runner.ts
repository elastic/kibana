/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';
import { uniq } from 'lodash';

import type { Agent } from '../../types';

import { AGENTS_INDEX } from '../../constants';

import { appContextService } from '../app_context';

import { FleetError } from '../../errors';

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

  const actionId = options.actionId ?? uuidv4();
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
    throw new FleetError(
      'Caught error while batch updating tags: ' + JSON.stringify(error).slice(0, 1000)
    );
  }

  if (appContextService.getLogger().isLevelEnabled('debug')) {
    appContextService.getLogger().debug(JSON.stringify(res).slice(0, 1000));
  }

  // creating unique ids to use as agentId, as we don't have all agent ids in case of action by kuery
  const getUuidArray = (count: number) => Array.from({ length: count }, () => uuidv4());

  const updatedCount = res.updated ?? 0;
  const updatedIds = getUuidArray(updatedCount);

  const failures = res.failures ?? [];
  const failureCount = failures.length;

  const isLastRetry = options.retryCount === MAX_RETRY_COUNT;

  const versionConflictCount = res.version_conflicts ?? 0;
  const versionConflictIds = isLastRetry ? getUuidArray(versionConflictCount) : [];

  const currentNameSpace = soClient.getCurrentNamespace();
  const namespaces = currentNameSpace ? [currentNameSpace] : [];

  // creating an action doc so that update tags  shows up in activity
  // the logic only saves agent count in the action that updated, failed or in case of last retry, conflicted
  // this ensures that the action status count will be accurate
  await createAgentAction(esClient, {
    id: actionId,
    agents: updatedIds
      .concat(failures.map((failure) => failure.id))
      .concat(isLastRetry ? versionConflictIds : []),
    namespaces,
    created_at: new Date().toISOString(),
    type: 'UPDATE_TAGS',
    total: options.total ?? res.total,
  });
  appContextService
    .getLogger()
    .debug(
      `action doc wrote on ${
        updatedCount + failureCount + (isLastRetry ? versionConflictCount : 0)
      } agentIds, updated: ${updatedCount}, failed: ${failureCount}, version_conflicts: ${versionConflictCount}`
    );

  // writing successful action results
  if (updatedCount > 0) {
    await bulkCreateAgentActionResults(
      esClient,
      updatedIds.map((id) => ({
        agentId: id,
        actionId,
        namespaces,
      }))
    );
    appContextService.getLogger().debug(`action updated result wrote on ${updatedCount} agents`);
  }

  // writing failures from es update
  if (failures.length > 0) {
    await bulkCreateAgentActionResults(
      esClient,
      failures.map((failure) => ({
        agentId: failure.id,
        actionId,
        namespace: currentNameSpace,
        error: failure.cause.reason,
      }))
    );
    appContextService.getLogger().debug(`action failed result wrote on ${failureCount} agents`);
  }

  if (versionConflictCount > 0) {
    // write out error results on last retry, so action is not stuck in progress
    if (options.retryCount === MAX_RETRY_COUNT) {
      await bulkCreateAgentActionResults(
        esClient,
        versionConflictIds.map((id) => ({
          agentId: id,
          actionId,
          namespace: currentNameSpace,
          error: 'version conflict on last retry',
        }))
      );
      appContextService
        .getLogger()
        .debug(`action conflict result wrote on ${versionConflictCount} agents`);
    }
    throw new FleetError(`Version conflict of ${versionConflictCount} agents`);
  }

  return { actionId, updated: res.updated, took: res.took };
}
