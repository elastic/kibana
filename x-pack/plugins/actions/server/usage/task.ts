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
import { ActionTypeRegistry } from '../action_type_registry';
import {
  getTotalCount,
  getInUseTotalCount,
  getExecutionsCount,
  getTotalInUseCountByActionTypes,
  getTotalCountByActionTypes,
  getExecutionsCountByActionTypes,
} from './actions_telemetry';

export const TELEMETRY_TASK_TYPE = 'actions_telemetry';

export const TASK_ID = `Actions-${TELEMETRY_TASK_TYPE}`;

export function initializeActionsTelemetry(
  logger: Logger,
  savedObjectsRepository: ISavedObjectsRepository,
  actionTypeRegistry: ActionTypeRegistry,
  taskManager: TaskManagerSetupContract,
  taskManagerStart: TaskManagerStartContract
) {
  registerActionsTelemetryTask(
    logger,
    savedObjectsRepository,
    actionTypeRegistry,
    taskManager,
    taskManagerStart
  );
}

export function scheduleActionsTelemetry(logger: Logger, taskManager?: TaskManagerStartContract) {
  if (taskManager) {
    scheduleTasks(logger, taskManager);
  }
}

function registerActionsTelemetryTask(
  logger: Logger,
  savedObjectsRepository: ISavedObjectsRepository,
  actionTypeRegistry: ActionTypeRegistry,
  taskManager: TaskManagerSetupContract,
  taskManagerStart: TaskManagerStartContract
) {
  taskManager.registerTaskDefinitions({
    [TELEMETRY_TASK_TYPE]: {
      title: 'Actions telemetry fetch task',
      type: TELEMETRY_TASK_TYPE,
      timeout: '5m',
      createTaskRunner: telemetryTaskRunner(
        logger,
        savedObjectsRepository,
        actionTypeRegistry,
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
  actionTypeRegistry: ActionTypeRegistry,
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
          getTotalInUseCountByActionTypes(savedObjectsRepository, actionTypeRegistry),
          getTotalCountByActionTypes(savedObjectsRepository, actionTypeRegistry),
          getExecutionsCountByActionTypes(taskManager, actionTypeRegistry),
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
          .catch(errMsg => logger.warn(`Error executing actions telemetry task: ${errMsg}`));
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
