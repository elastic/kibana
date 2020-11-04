/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISavedObjectsRepository, Logger } from 'kibana/server';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../task_manager/server';
import { AlertsConfig } from '../config';
import { HealthStatus } from '../types';
import { getHealth } from './get_health';

export const HEALTH_TASK_TYPE = 'alerting_health_check';

export const HEALTH_TASK_ID = `Alerting-${HEALTH_TASK_TYPE}`;

export function initializeAlertingHealth(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  internalSavedObjectsRepository: Promise<{
    createInternalRepository: () => ISavedObjectsRepository;
  }>
) {
  registerAlertingHealthCheckTask(logger, taskManager, internalSavedObjectsRepository);
}

export function scheduleAlertingHealthCheck(
  logger: Logger,
  config: Promise<AlertsConfig>,
  taskManager?: TaskManagerStartContract
) {
  if (taskManager) {
    scheduleTasks(logger, taskManager, config);
  }
}

function registerAlertingHealthCheckTask(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  internalSavedObjectsRepository: Promise<{
    createInternalRepository: () => ISavedObjectsRepository;
  }>
) {
  taskManager.registerTaskDefinitions({
    [HEALTH_TASK_TYPE]: {
      title: 'Alerting framework health check task',
      createTaskRunner: healthCheckTaskRunner(logger, internalSavedObjectsRepository),
    },
  });
}

async function scheduleTasks(
  logger: Logger,
  taskManager: TaskManagerStartContract,
  config: Promise<AlertsConfig>
) {
  try {
    const interval = (await config).healthCheck.interval;
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

export function healthCheckTaskRunner(
  logger: Logger,
  internalSavedObjectsRepository: Promise<{
    createInternalRepository: () => ISavedObjectsRepository;
  }>
) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    return {
      async run() {
        const repository = await (await internalSavedObjectsRepository).createInternalRepository();
        try {
          const alertingHealthStatus = await getHealth(repository);
          return {
            state: {
              runs: (state.runs || 0) + 1,
              health_status: alertingHealthStatus.decryptionHealth.status,
            },
          };
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
