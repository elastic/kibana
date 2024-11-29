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
import { HealthStatus } from '@kbn/alerting-types';
import { AlertingConfig } from '../config';
import { AlertingPluginsStart } from '../plugin';
import { getAlertingHealthStatus } from './get_health';
import { stateSchemaByVersion, emptyState, type LatestTaskStateSchema } from './task_state';

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
      state: emptyState,
      params: {},
    });
  } catch (e) {
    logger.error(`Error scheduling ${HEALTH_TASK_ID}, received ${e.message}`);
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
      stateSchemaByVersion,
      createTaskRunner: healthCheckTaskRunner(logger, coreStartServices),
    },
  });
}

export function healthCheckTaskRunner(
  logger: Logger,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>
) {
  return ({ taskInstance }: RunContext) => {
    const state = taskInstance.state as LatestTaskStateSchema;
    return {
      async run() {
        try {
          const result = await getAlertingHealthStatus(
            (
              await coreStartServices
            )[0].savedObjects,
            state.runs
          );
          const updatedState: LatestTaskStateSchema = result.state;
          return { state: updatedState };
        } catch (errMsg) {
          logger.warn(`Error executing alerting health check task: ${errMsg}`);
          const updatedState: LatestTaskStateSchema = {
            runs: state.runs + 1,
            health_status: HealthStatus.Error,
          };
          return {
            state: updatedState,
          };
        }
      },
    };
  };
}
