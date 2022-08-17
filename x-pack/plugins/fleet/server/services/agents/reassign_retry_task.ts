/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClient } from '@kbn/core/server';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';

import { appContextService } from '../app_context';

import { runReassignAsync } from './reassign';

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

      runReassignAsync(soClient, esClient, { ...options, taskId: taskInstance.id });

      appContextService.getLogger().info('Completed bulk reassign retry task');
    },

    async cancel() {
      // appContextService.getLogger().debug('Cancel bulk reassign task');
    },
  };
}
