/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, KibanaRequest } from 'kibana/server';
import moment from 'moment';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../task_manager/server';
import { AlertsClient } from '../alerts_client';
import { GetBasePathFunction } from '../types';

export const HEALTH_TASK_TYPE = 'alerting_health_check';

export const HEALTH_TASK_ID = `Alerting-${HEALTH_TASK_TYPE}`;

export function initializeAlertingHealth(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  getBasePath: GetBasePathFunction,
  getAlertsClientWithRequest: (
    request: KibanaRequest
  ) => Promise<{
    getAlertsClient: () => AlertsClient;
  }>
) {
  const request = getFakeKibanaRequest(getBasePath);
  registerAlertingHealthCheckTask(logger, taskManager, getAlertsClientWithRequest(request));
}

export function scheduleAlertingHealthCheck(
  logger: Logger,
  taskManager?: TaskManagerStartContract
) {
  if (taskManager) {
    scheduleTasks(logger, taskManager);
  }
}

function getFakeKibanaRequest(getBasePath: GetBasePathFunction) {
  const requestHeaders: Record<string, string> = {};
  return ({
    headers: requestHeaders,
    getBasePath: () => getBasePath(),
    path: '/',
    route: { settings: {} },
    url: {
      href: '/',
    },
    raw: {
      req: {
        url: '/',
      },
    },
  } as unknown) as KibanaRequest;
}

function registerAlertingHealthCheckTask(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  alertsClient: Promise<{
    getAlertsClient: () => AlertsClient;
  }>
) {
  taskManager.registerTaskDefinitions({
    [HEALTH_TASK_TYPE]: {
      title: 'Alerting framework health check task',
      type: HEALTH_TASK_TYPE,
      timeout: '5m',
      createTaskRunner: healthCheckTaskRunner(logger, alertsClient),
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

export function healthCheckTaskRunner(
  logger: Logger,
  alertsClient: Promise<{
    getAlertsClient: () => AlertsClient;
  }>
) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    return {
      async run() {
        try {
          const alertingHealthStatus = await (
            await alertsClient.getAlertsClient()
          ).hasDecryptionFailures();
          return {
            state: {
              runs: (state.runs || 0) + 1,
              isHealthy: alertingHealthStatus,
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
