/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, ISavedObjectsRepository } from 'kibana/server';
import moment from 'moment';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../task_manager/server';
import { AlertTypeRegistry } from '../alert_type_registry';

import {
  getTotalCount,
  getInUseTotalCount,
  getTotalInUseCountByAlertTypes,
  getExecutionsCount,
  getTotalCountByAlertTypes,
  getExecutionsCountByAlertTypes,
} from './alerts_telemetry';

export const TELEMETRY_TASK_TYPE = 'alerting_telemetry';

export const TASK_ID = `Alerting-${TELEMETRY_TASK_TYPE}`;

export function initializeAlertingTelemetry(
  logger: Logger,
  savedObjectsRepository: ISavedObjectsRepository,
  alertTypeRegistry: AlertTypeRegistry,
  taskManager: TaskManagerSetupContract,
  taskManagerStart: TaskManagerStartContract
) {
  registerAlertingTelemetryTask(
    logger,
    savedObjectsRepository,
    alertTypeRegistry,
    taskManager,
    taskManagerStart
  );
}

export function scheduleAlertingTelemetry(logger: Logger, taskManager?: TaskManagerStartContract) {
  if (taskManager) {
    scheduleTasks(logger, taskManager);
  }
}

function registerAlertingTelemetryTask(
  logger: Logger,
  savedObjectsRepository: ISavedObjectsRepository,
  alertTypeRegistry: AlertTypeRegistry,
  taskManager: TaskManagerSetupContract,
  taskManagerStart: TaskManagerStartContract
) {
  taskManager.registerTaskDefinitions({
    [TELEMETRY_TASK_TYPE]: {
      title: 'Alerting telemetry fetch task',
      type: TELEMETRY_TASK_TYPE,
      timeout: '1m',
      createTaskRunner: telemetryTaskRunner(
        logger,
        savedObjectsRepository,
        alertTypeRegistry,
        taskManagerStart
      ),
    },
  });
}

async function scheduleTasks(logger: Logger, taskManager: TaskManagerStartContract) {
  try {
    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TELEMETRY_TASK_TYPE,
      state: { byDate: {}, suggestionsByDate: {}, saved: {}, runs: 0 },
      params: {},
    });
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}

export function telemetryTaskRunner(
  logger: Logger,
  savedObjectsRepository: ISavedObjectsRepository,
  alertTypeRegistry: AlertTypeRegistry,
  taskManager: TaskManagerStartContract
) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    return {
      async run() {
        return Promise.all([
          getTotalCount(savedObjectsRepository),
          getInUseTotalCount(savedObjectsRepository),
          getExecutionsCount(taskManager),
          getTotalInUseCountByAlertTypes(savedObjectsRepository, alertTypeRegistry),
          getTotalCountByAlertTypes(savedObjectsRepository, alertTypeRegistry),
          getExecutionsCountByAlertTypes(taskManager, alertTypeRegistry),
        ])
          .then(
            ([
              countTotal,
              countActiveTotal,
              executionsTotal,
              countActiveByType,
              countByType,
              executionByType,
            ]) => {
              return {
                state: {
                  runs: (state.runs || 0) + 1,
                  count_total: countTotal,
                  count_active_total: countActiveTotal,
                  executions_total: executionsTotal,
                  count_active_by_type: countActiveByType,
                  count_by_type: countByType,
                  executions_by_type: executionByType,
                },
                runAt: getNextMidnight(),
              };
            }
          )
          .catch(errMsg => logger.warn(`Error executing alerting telemetry task: ${errMsg}`));
      },
    };
  };
}

function getNextMidnight() {
  return moment()
    .add(1, 'day')
    .startOf('day')
    .toDate();
}
