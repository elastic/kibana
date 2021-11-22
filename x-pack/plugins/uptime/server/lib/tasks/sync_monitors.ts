/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../task_manager/server';

const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE =
  'UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects';
const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID = 'UPTIME:SyntheticsService:sync-task';

export function registerSyntheticsServiceTasks(
  taskManager: TaskManagerSetupContract,
  logger?: Logger
) {
  taskManager.registerTaskDefinitions({
    [SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE]: {
      title: 'Synthetics Service - Sync Saved Monitors',
      description:
        'This task periodically pushes monitors saved in monitor management to Synthetics Service, monitors which are configured to run in cloud via synthetics service.',
      timeout: '1m',
      maxAttempts: 3,
      maxConcurrency: 1,

      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        return {
          // Perform the work of the task. The return value should fit the TaskResult interface, documented
          // below. Invalid return values will result in a logged warning.
          async run() {
            const { params, state, id } = taskInstance;
            const prevState = state || { count: 0 };

            logger?.info(
              `Synthetics sync task: ran at:  ${new Date(
                Date.now()
              ).toISOString()}, prevState: ${JSON.stringify(
                prevState
              )}, id: ${id}, params: ${JSON.stringify(params)}`
            );
            return { state };
          },

          // Will be called if a running instance of this task times out
          async cancel() {
            logger?.warn(`Task ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID} timed out`);
          },
        };
      },
    },
  });
}

export function ensureSyntheticsServiceSyncTaskScheduled(
  taskManager: TaskManagerStartContract,
  logger?: Logger
) {
  taskManager
    .ensureScheduled({
      id: SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID,
      taskType: SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE,
      schedule: {
        interval: '5m',
      },
      params: {},
      state: {},
      scope: ['uptime'],
    })
    .then((_result) => {
      logger?.info(JSON.stringify(_result));
      logger?.info(`Task Instance Successful: ` + JSON.stringify(_result));
    })
    .catch((e) => {
      logger?.error(
        `Error running task: ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID}, `,
        e?.message() ?? e
      );
    });
}
