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
import { schema, TypeOf } from '@kbn/config-schema';
import { AlertingConfig } from '../config';
import { AlertingPluginsStart } from '../plugin';
import { HealthStatus } from '../types';
import { getAlertingHealthStatus } from './get_health';

export const HEALTH_TASK_TYPE = 'alerting_health_check';

export const HEALTH_TASK_ID = `Alerting-${HEALTH_TASK_TYPE}`;

const stateSchemaByVersion = {
  1: {
    up: (state: Record<string, unknown>) => ({
      runs: state.runs || 0,
      // OK unless proven otherwise
      health_status: state.health_status || HealthStatus.OK,
    }),
    schema: schema.object({
      runs: schema.number(),
      health_status: schema.string(),
    }),
  },
};

const latestTaskStateSchema = stateSchemaByVersion[1].schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

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
    const state: LatestTaskStateSchema = {
      runs: 0,
      // OK unless proven otherwise
      health_status: HealthStatus.OK,
    };
    await taskManager.ensureScheduled({
      id: HEALTH_TASK_ID,
      taskType: HEALTH_TASK_TYPE,
      schedule: {
        interval,
      },
      state,
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
