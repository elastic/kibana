/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, CoreSetup } from 'kibana/server';
import moment from 'moment';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../task_manager/server';
import { AlertsClient } from '../alerts_client';

export const HEALTH_TASK_TYPE = 'alerting_health_check';

export const HEALTH_TASK_ID = `Alerting-${HEALTH_TASK_TYPE}`;

export function initializeAlertingHealth(
  logger: Logger,
  core: CoreSetup,
  taskManager: TaskManagerSetupContract,
  alertsClient: AlertsClient
) {
  registerAlertingHealthCheckTask(logger, core, taskManager, alertsClient);
}

export function scheduleAlertingHealthCheck(
  logger: Logger,
  taskManager?: TaskManagerStartContract
) {
  if (taskManager) {
    scheduleTasks(logger, taskManager);
  }
}

function registerAlertingHealthCheckTask(
  logger: Logger,
  core: CoreSetup,
  taskManager: TaskManagerSetupContract,
  alertsClient: AlertsClient
) {
  taskManager.registerTaskDefinitions({
    [HEALTH_TASK_TYPE]: {
      title: 'Alerting framework health check task',
      type: HEALTH_TASK_TYPE,
      timeout: '5m',
      createTaskRunner: healthCheckTaskRunner(logger, core, alertsClient),
    },
  });
}

async function scheduleTasks(logger: Logger, taskManager: TaskManagerStartContract) {
  try {
    await taskManager.ensureScheduled({
      id: HEALTH_TASK_ID,
      taskType: HEALTH_TASK_TYPE,
      state: { byDate: {}, suggestionsByDate: {}, saved: {}, runs: 0 },
      params: {},
    });
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}

export function healthCheckTaskRunner(logger: Logger, core: CoreSetup, alertsClient: AlertsClient) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    return {
      async run() {
        try {
          const alertClientAlerts = await alertsClient.find({
            options: {
              filter: `alert.attributes.alertTypeId:${'.index-threshold'}`,
              page: 0,
              perPage: 0,
            },
          });
          return {
            state: {
              runs: (state.runs || 0) + 1,
              isHealthy: alertClientAlerts.total === 0,
            },
            runAt: getNextHour(),
          };
        } catch (errMsg) {
          logger.warn(`Error executing alerting health check task: ${errMsg}`);
          return {
            state: {
              runs: (state.runs || 0) + 1,
              isHealthy: false,
            },
            runAt: getNextHour(),
          };
        }
      },
    };
  };
}

function getNextHour() {
  return moment().add(1, 'h').toDate();
}
