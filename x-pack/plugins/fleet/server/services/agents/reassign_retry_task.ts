/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClient } from '@kbn/core/server';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';

import type { Agent } from '../../types';
import { appContextService } from '../app_context';

import { getAgentActions } from './actions';
import { processAgentsInBatches } from './crud';
import { reassignBatch } from './reassign';

export function reassignRetryTask(
  taskInstance: ConcreteTaskInstance,
  getDeps: () => Promise<{ esClient: ElasticsearchClient; soClient: SavedObjectsClient }>
) {
  return {
    async run() {
      appContextService.getLogger().info('Running bulk reassign retry task');

      const { esClient, soClient } = await getDeps();

      const options = taskInstance.params.options;

      appContextService
        .getLogger()
        .debug(`Retry #${options.retryCount} of task ${taskInstance.id}`);

      if (options.searchAfter) {
        appContextService.getLogger().info('Continuing task from batch ' + options.searchAfter);
      }

      let lastSearchAfter: SortResults | undefined;

      const outgoingErrors: Record<Agent['id'], Error> = {};

      processAgentsInBatches(
        esClient,
        {
          kuery: options.kuery,
          showInactive: options.showInactive ?? false,
          batchSize: options.batchSize,
          pitId: options.pitId,
          searchAfter: options.searchAfter,
        },
        async (
          agents: Agent[],
          skipSuccess: boolean,
          searchAfter?: Array<number | string | null>,
          total?: number
        ) => {
          lastSearchAfter = searchAfter;
          const actions = await getAgentActions(esClient, options.actionId);

          // skipping batch if there is already an action document present with last agent ids
          for (const action of actions) {
            if (action.agents?.[0] === agents[0].id) {
              return { items: [] };
            }
          }
          return await reassignBatch(
            soClient,
            esClient,
            { newAgentPolicyId: options.newAgentPolicyId, actionId: options.actionId },
            agents,
            outgoingErrors,
            undefined,
            skipSuccess,
            total
          );
        }
      ).catch(async (error) => {
        appContextService
          .getLogger()
          .error(
            `Retry #${options.retryCount} of task ${taskInstance.id} failed: ${error.message}`
          );

        if (options.retryCount === 3) {
          appContextService.getLogger().debug('Stopping after 3rd retry');
          return {
            error: { message: 'Failed after 3rd retry' },
            state: {},
          };
        }

        await appContextService.getBulkActionsResolver()!.run(
          {
            ...options,
            searchAfter: lastSearchAfter,
            retryCount: options.retryCount + 1,
          },
          taskInstance.taskType
        );
      });
      appContextService.getLogger().info('Completed bulk reassign task');
    },

    async cancel() {
      // appContextService.getLogger().debug('Cancel bulk reassign task');
    },
  };
}
