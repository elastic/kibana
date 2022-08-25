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

import type { Agent, BulkActionResult, ListWithKuery } from '../../types';
import { appContextService } from '..';
import { AGENT_ACTIONS_STATUS_INDEX, SO_SEARCH_LIMIT } from '../../../common/constants';

import { getAgentActions } from './actions';
import { closePointInTime, getAgentsByKuery, openPointInTime } from './crud';

export interface ActionParams {
  kuery: string;
  showInactive?: boolean;
  batchSize?: number;
  totalAgents?: number;
  actionId?: string;
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

  protected actionParams?: ActionParams;
  protected retryParams?: RetryParams;

  constructor(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract) {
    this.esClient = esClient;
    this.soClient = soClient;
  }

  protected abstract getActionType(): string;

  protected abstract getTaskType(): string;

  protected abstract processAgents(agents: Agent[]): Promise<{ items: BulkActionResult[] }>;

  public async runActionAsyncWithRetry(actionParams: ActionParams, retryParams?: RetryParams) {
    const retryPs = (this.retryParams = retryParams ?? {
      pitId: await openPointInTime(this.esClient),
    });
    const actionP = (this.actionParams = {
      ...actionParams,
      actionId: actionParams.actionId ?? uuid(),
    });

    appContextService
      .getLogger()
      .info(
        `Running action asynchronously, actionId: ${actionP.actionId}, total agents: ${actionP.totalAgents}`
      );

    withSpan({ name: this.getTaskType(), type: 'action' }, () =>
      this.processAgentsInBatches(this.esClient, {
        kuery: actionP.kuery,
        showInactive: actionP.showInactive ?? false,
        batchSize: actionP.batchSize,
        pitId: retryPs.pitId,
        searchAfter: retryPs.searchAfter,
      }).catch(async (error) => {
        const createActionStatus = (errorMessage: string) =>
          this.createActionStatus(this.esClient, {
            '@timestamp': new Date().toISOString(),
            error_message: errorMessage,
            status: 'failed',
            action_id: actionP.actionId,
          });

        // 404 error comes when PIT query is closed
        if (isResponseError(error) && error.statusCode === 404) {
          const errorMessage =
            '404 error from elasticsearch, not retrying. Error: ' + error.message;
          appContextService.getLogger().warn(errorMessage);
          await createActionStatus(errorMessage);
          return;
        }
        if (retryPs.retryCount) {
          appContextService
            .getLogger()
            .error(
              `Retry #${retryPs.retryCount} of task ${retryPs.taskId} failed: ${error.message}`
            );

          if (retryPs.retryCount === 3) {
            const errorMessage = 'Stopping after 3rd retry. Error: ' + error.message;
            appContextService.getLogger().warn(errorMessage);
            await createActionStatus(errorMessage);
            return;
          }
        } else {
          appContextService.getLogger().error(`Action failed: ${error.message}`);
        }
        const taskId = await appContextService.getBulkActionsResolver()!.run(
          actionP,
          {
            ...retryPs,
            retryCount: (retryPs.retryCount ?? 0) + 1,
          },
          this.getTaskType()
        );

        appContextService.getLogger().info(`Retrying in task: ${taskId}`);
      })
    );

    return { items: [] };
  }

  async createActionStatus(esClient: ElasticsearchClient, data: any): Promise<void> {
    await esClient.create({
      index: AGENT_ACTIONS_STATUS_INDEX,
      id: uuid(),
      body: { data },
      refresh: 'wait_for',
    });
  }

  private async processBatch(
    agents: Agent[],
    searchAfter?: SortResults
  ): Promise<{ items: BulkActionResult[] }> {
    const retryPs = this.retryParams!;
    retryPs.searchAfter = searchAfter;

    if (retryPs.retryCount) {
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

  public async processAgentsInBatches(
    esClient: ElasticsearchClient,
    options: Omit<ListWithKuery, 'page' | 'perPage'> & {
      showInactive: boolean;
      batchSize?: number;
      pitId: string;
      searchAfter?: SortResults;
    }
  ): Promise<{ items: BulkActionResult[] }> {
    const start = Date.now();
    const pitId = options.pitId;

    const perPage = options.batchSize ?? SO_SEARCH_LIMIT;

    const res = await getAgentsByKuery(esClient, {
      ...options,
      page: 1,
      perPage,
      pitId,
      searchAfter: options.searchAfter,
    });

    let currentAgents = res.agents;
    if (currentAgents.length === 0) {
      appContextService
        .getLogger()
        .debug('currentAgents returned 0 hits, returning from bulk action query');
      return { items: [] }; // stop executing if there are no more results
    }

    let results = await this.processBatch(currentAgents, options.searchAfter);
    let allAgentsProcessed = currentAgents.length;

    // throw new Error('simulating error after batch processed ');

    while (allAgentsProcessed < res.total) {
      const lastAgent = currentAgents[currentAgents.length - 1];
      const searchAfter = lastAgent.sort!;
      const nextPage = await getAgentsByKuery(esClient, {
        ...options,
        page: 1,
        perPage,
        pitId,
        searchAfter,
      });
      currentAgents = nextPage.agents;
      if (currentAgents.length === 0) {
        appContextService
          .getLogger()
          .debug('currentAgents returned 0 hits, returning from bulk action query');
        break; // stop executing if there are no more results
      }
      const currentResults = await this.processBatch(currentAgents, searchAfter);
      results = { items: results.items.concat(currentResults.items) };
      allAgentsProcessed += currentAgents.length;
      if (allAgentsProcessed > 4)
        throw new Error('simulating error after batch processed ' + searchAfter);
    }

    await closePointInTime(esClient, pitId);

    appContextService.getLogger().info(`processAgentsInBatches took ${Date.now() - start}ms`);
    return { ...results };
  }
}
