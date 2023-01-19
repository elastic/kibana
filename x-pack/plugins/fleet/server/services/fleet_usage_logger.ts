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
              if (appContextService.getLogger().isLevelEnabled('debug')) {
                appContextService.getLogger().debug(`Fleet Usage: ${JSON.stringify(usageData)}`);
              } else {
                appContextService.getLogger().info(`Fleet Usage: ${JSON.stringify(usageData)}`);
              }
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
  const isDebugLogLevelEnabled = appContextService.getLogger().isLevelEnabled('debug');
  const isInfoLogLevelEnabled = appContextService.getLogger().isLevelEnabled('info');
  if (!isInfoLogLevelEnabled) {
    return;
  }
  const interval = isDebugLogLevelEnabled ? '5m' : '15m';

  // Re-schedule the task if interval changed
  const task = await taskManager?.get(TASK_ID).catch((err) => {
    if (err.output.statusCode === 404) {
      return null;
    }

    throw err;
  });
  if (task?.schedule?.interval !== interval) {
    await taskManager?.removeIfExists(TASK_ID);
  }
  appContextService.getLogger().info(`Task ${TASK_ID} scheduled with interval ${interval}`);
  await taskManager?.ensureScheduled({
    id: TASK_ID,
    taskType: TASK_TYPE,
    schedule: {
      interval,
    },
    scope: ['fleet'],
    state: {},
    params: {},
  });
}
