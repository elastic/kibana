/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Logger } from '@kbn/core/server';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { AlertingConfig } from '../config';
import { AlertingPluginsStart } from '../plugin';
import { HealthStatus } from '../types';
import { getAlertingHealthStatus } from './get_health';

export const HEALTH_TASK_TYPE = 'alerting_health_check';

export const HEALTH_TASK_ID = `Alerting-${HEALTH_TASK_TYPE}`;

export function initializeAlertingHealth(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>
) {
  registerAlertingHealthCheckTask(logger, taskManager, coreStartServices);
}

export async function scheduleAlertingHealthCheck(
  logger: Logger,
  config: AlertingConfig,
  taskManager: TaskManagerStartContract
) {
  try {
    const interval = config.healthCheck.interval;
    await taskManager.ensureScheduled({
      id: HEALTH_TASK_ID,
      taskType: HEALTH_TASK_TYPE,
      schedule: {
        interval,
      },
      state: {},
      params: {},
    });
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}

function registerAlertingHealthCheckTask(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>
) {
  taskManager.registerTaskDefinitions({
    [HEALTH_TASK_TYPE]: {
      title: 'Alerting framework health check task',
      createTaskRunner: healthCheckTaskRunner(logger, coreStartServices),
    },
  });
}

export function healthCheckTaskRunner(
  logger: Logger,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>
) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    return {
      async run() {
        try {
          return await getAlertingHealthStatus(
            (
              await coreStartServices
            )[0].savedObjects,
            state.runs
          );
        } catch (errMsg) {
          logger.warn(`Error executing alerting health check task: ${errMsg}`);
          return {
            state: {
              runs: (state.runs || 0) + 1,
              health_status: HealthStatus.Error,
            },
          };
        }
      },
    };
  };
}
