/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ConcreteTaskInstance,
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';

import type { fetchAgentsUsage } from '../collectors/register';

import { appContextService } from './app_context';

const TASK_ID = 'Fleet-Usage-Logger-Task';
const TASK_TYPE = 'Fleet-Usage-Logger';

export async function registerFleetUsageLogger(
  taskManager: TaskManagerSetupContract,
  fetchUsage: () => ReturnType<typeof fetchAgentsUsage>
) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Fleet Usage Logger',
      timeout: '1m',
      maxAttempts: 1,
      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        return {
          async run() {
            try {
              const usageData = await fetchUsage();
              // TODO get log level and use debug or info based on that
              appContextService.getLogger().info(`Feet Usage: ${JSON.stringify(usageData)}`);
            } catch (error) {
              appContextService
                .getLogger()
                .error('Error occurred while fetching fleet usage: ' + error);
            }
          },

          async cancel() {},
        };
      },
    },
  });
}

export async function startFleetUsageLogger(taskManager: TaskManagerStartContract) {
  // TODO get log level and schedule interval based on that
  appContextService.getLogger().info(`Task ${TASK_ID} scheduled with interval 5m`);
  await taskManager?.ensureScheduled({
    id: TASK_ID,
    taskType: TASK_TYPE,
    schedule: {
      interval: '5m',
    },
    scope: ['fleet'],
    state: {},
    params: {},
  });
}
