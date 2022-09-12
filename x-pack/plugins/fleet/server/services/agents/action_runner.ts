/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';

import { isResponseError } from '@kbn/es-errors';

import type { Agent, BulkActionResult } from '../../types';
import { appContextService } from '..';
import { SO_SEARCH_LIMIT } from '../../../common/constants';

import { getAgentActions } from './actions';
import { closePointInTime, getAgentsByKuery } from './crud';

export interface ActionParams {
  kuery: string;
  showInactive?: boolean;
  batchSize?: number;
  total?: number;
  actionId?: string;
  // additional parameters specific to an action e.g. reassign to new policy id
  [key: string]: any;
}

export interface RetryParams {
  pitId: string;
  searchAfter?: SortResults;
  retryCount?: number;
  taskId?: string;
}

export abstract class ActionRunner {
  protected esClient: ElasticsearchClient;
  protected soClient: SavedObjectsClientContract;

  protected actionParams: ActionParams;
  protected retryParams: RetryParams;

  constructor(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    actionParams: ActionParams,
    retryParams: RetryParams
  ) {
    this.esClient = esClient;
    this.soClient = soClient;
    this.actionParams = { ...actionParams, actionId: actionParams.actionId ?? uuid() };
    this.retryParams = retryParams;
  }

  protected abstract getActionType(): string;

  protected abstract getTaskType(): string;

  protected abstract processAgents(agents: Agent[]): Promise<{ items: BulkActionResult[] }>;

  /**
   * Common runner logic accross all agent bulk actions
   * Starts action execution immeditalely, asynchronously
   * On errors, starts a task with Task Manager to retry max 3 times
   * If the last batch was stored in state, retry continues from there (searchAfter)
   */
  public async runActionAsyncWithRetry(): Promise<{ items: BulkActionResult[]; actionId: string }> {
    appContextService
      .getLogger()
      .info(
        `Running action asynchronously, actionId: ${this.actionParams.actionId}, total agents: ${this.actionParams.total}`
      );

    withSpan({ name: this.getActionType(), type: 'action' }, () =>
      this.processAgentsInBatches().catch(async (error) => {
        // 404 error comes when PIT query is closed
        if (isResponseError(error) && error.statusCode === 404) {
          const errorMessage =
            '404 error from elasticsearch, not retrying. Error: ' + error.message;
          appContextService.getLogger().warn(errorMessage);
          return;
        }
        if (this.retryParams.retryCount) {
          appContextService
            .getLogger()
            .error(
              `Retry #${this.retryParams.retryCount} of task ${this.retryParams.taskId} failed: ${error.message}`
            );

          if (this.retryParams.retryCount === 3) {
            const errorMessage = 'Stopping after 3rd retry. Error: ' + error.message;
            appContextService.getLogger().warn(errorMessage);
            return;
          }
        } else {
          appContextService.getLogger().error(`Action failed: ${error.message}`);
        }
        const taskId = await appContextService.getBulkActionsResolver()!.run(
          this.actionParams,
          {
            ...this.retryParams,
            retryCount: (this.retryParams.retryCount ?? 0) + 1,
          },
          this.getTaskType()
        );

        appContextService.getLogger().info(`Retrying in task: ${taskId}`);
      })
    );

    return { items: [], actionId: this.actionParams.actionId! };
  }

  private async processBatch(agents: Agent[]): Promise<{ items: BulkActionResult[] }> {
    if (this.retryParams.retryCount) {
      try {
        const actions = await getAgentActions(this.esClient, this.actionParams!.actionId!);

        // skipping batch if there is already an action document present with last agent ids
        for (const action of actions) {
          if (action.agents?.[0] === agents[0].id) {
            return { items: [] };
          }
        }
      } catch (error) {
        appContextService.getLogger().debug(error.message); // if action not found, swallow
      }
    }

    return await this.processAgents(agents);
  }

  async processAgentsInBatches(): Promise<{ items: BulkActionResult[] }> {
    const start = Date.now();
    const pitId = this.retryParams.pitId;

    const perPage = this.actionParams.batchSize ?? SO_SEARCH_LIMIT;

    const getAgents = () =>
      getAgentsByKuery(this.esClient, {
        kuery: this.actionParams.kuery,
        showInactive: this.actionParams.showInactive ?? false,
        page: 1,
        perPage,
        pitId,
        searchAfter: this.retryParams.searchAfter,
      });

    const res = await getAgents();

    let currentAgents = res.agents;
    if (currentAgents.length === 0) {
      appContextService
        .getLogger()
        .debug('currentAgents returned 0 hits, returning from bulk action query');
      return { items: [] }; // stop executing if there are no more results
    }

    let results = await this.processBatch(currentAgents);
    let allAgentsProcessed = currentAgents.length;

    while (allAgentsProcessed < res.total) {
      const lastAgent = currentAgents[currentAgents.length - 1];
      this.retryParams.searchAfter = lastAgent.sort!;
      const nextPage = await getAgents();
      currentAgents = nextPage.agents;
      if (currentAgents.length === 0) {
        appContextService
          .getLogger()
          .debug('currentAgents returned 0 hits, returning from bulk action query');
        break; // stop executing if there are no more results
      }
      const currentResults = await this.processBatch(currentAgents);
      results = { items: results.items.concat(currentResults.items) };
      allAgentsProcessed += currentAgents.length;
    }

    await closePointInTime(this.esClient, pitId!);

    appContextService
      .getLogger()
      .info(`processed ${allAgentsProcessed} agents, took ${Date.now() - start}ms`);
    return { ...results };
  }
}
