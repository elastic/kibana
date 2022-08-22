/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';

import type { Agent, BulkActionResult, ListWithKuery } from '../../types';
import { appContextService } from '..';
import { SO_SEARCH_LIMIT } from '../../../common/constants';

import { getAgentActions } from './actions';
import { closePointInTime, getAgentsByKuery, openPointInTime } from './crud';

export abstract class ActionRunner {
  protected esClient: ElasticsearchClient;

  protected pitId?: string;
  protected searchAfter?: SortResults;
  protected retryCount?: number;
  protected actionId?: string;

  constructor(esClient: ElasticsearchClient) {
    this.esClient = esClient;
  }

  protected abstract getActionType(): string;

  protected abstract processAgents(
    agents: Agent[],
    actionId: string,
    total?: number
  ): Promise<{ items: BulkActionResult[] }>;

  protected getActionParams(): { [key: string]: any } {
    return {};
  }

  public async runActionAsyncWithRetry(options: {
    kuery: string;
    showInactive?: boolean;
    force?: boolean;
    batchSize?: number;
    totalAgents?: number;
    pitId?: string;
    actionId?: string;
    searchAfter?: SortResults;
    retryCount?: number;
    taskId?: string;
  }) {
    this.pitId = options.pitId ?? (await openPointInTime(this.esClient));
    this.actionId = options.actionId ?? uuid();
    this.retryCount = options.retryCount;
    this.searchAfter = options.searchAfter;
    appContextService
      .getLogger()
      .info(
        `Running action asynchronously, actionId: ${this.actionId}, total agents: ${options.totalAgents}`
      );

    withSpan({ name: this.getActionType(), type: 'action' }, () =>
      this.processAgentsInBatches(this.esClient, {
        kuery: options.kuery,
        showInactive: options.showInactive ?? false,
        batchSize: options.batchSize,
        pitId: this.pitId,
        searchAfter: options.searchAfter,
      }).catch(async (error) => {
        if (options.retryCount) {
          appContextService
            .getLogger()
            .error(
              `Retry #${options.retryCount} of task ${options.taskId} failed: ${error.message}`
            );

          if (options.retryCount === 3) {
            appContextService.getLogger().debug('Stopping after 3rd retry');
            return {
              error: { message: 'Failed after 3rd retry' },
              state: {},
            };
          }
        } else {
          appContextService.getLogger().error(`Action failed: ${error.message}`);
        }
        const taskId = await appContextService.getBulkActionsResolver()!.run(
          {
            ...options,
            ...this.getActionParams(),
            pitId: this.pitId!,
            searchAfter: this.searchAfter,
            actionId: this.actionId!,
            retryCount: (options.retryCount ?? 0) + 1,
          },
          this.getActionType()
        );

        appContextService.getLogger().info(`Retrying in task: ${taskId}`);
      })
    );

    return { items: [] };
  }

  private async processBatch(
    agents: Agent[],
    searchAfter?: SortResults,
    total?: number
  ): Promise<{ items: BulkActionResult[] }> {
    this.searchAfter = searchAfter;

    if (this.retryCount) {
      try {
        const actions = await getAgentActions(this.esClient, this.actionId!);

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

    return await this.processAgents(agents, this.actionId!, total);
  }

  public async processAgentsInBatches(
    esClient: ElasticsearchClient,
    options: Omit<ListWithKuery, 'page' | 'perPage'> & {
      showInactive: boolean;
      batchSize?: number;
      pitId?: string;
      searchAfter?: SortResults;
    }
  ): Promise<{ items: BulkActionResult[] }> {
    const start = Date.now();
    const pitId = options.pitId ?? (await openPointInTime(esClient));

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

    let results = await this.processBatch(currentAgents, options.searchAfter, res.total);
    let allAgentsProcessed = currentAgents.length;

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
      const currentResults = await this.processBatch(currentAgents, searchAfter, res.total);
      results = { items: results.items.concat(currentResults.items) };
      allAgentsProcessed += currentAgents.length;
      // if (allAgentsProcessed > 200) throw new Error('simulating error after batch processed ' + searchAfter);
    }

    await closePointInTime(esClient, pitId);

    appContextService.getLogger().info(`processAgentsInBatches took ${Date.now() - start}ms`);
    return { ...results };
  }
}
