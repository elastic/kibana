/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, CoreSetup, LegacyAPICaller } from 'kibana/server';
import moment from 'moment';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../task_manager/server';

import { getTotalCountAggregations, getTotalCountInUse } from './alerts_telemetry';

export const TELEMETRY_TASK_TYPE = 'alerting_telemetry';

export const TASK_ID = `Alerting-${TELEMETRY_TASK_TYPE}`;

export function initializeAlertingTelemetry(
  logger: Logger,
  core: CoreSetup,
  taskManager: TaskManagerSetupContract,
  kibanaIndex: string
) {
  registerAlertingTelemetryTask(logger, core, taskManager, kibanaIndex);
}

export function scheduleAlertingTelemetry(logger: Logger, taskManager?: TaskManagerStartContract) {
  if (taskManager) {
    scheduleTasks(logger, taskManager);
  }
}

function registerAlertingTelemetryTask(
  logger: Logger,
  core: CoreSetup,
  taskManager: TaskManagerSetupContract,
  kibanaIndex: string
) {
  taskManager.registerTaskDefinitions({
    [TELEMETRY_TASK_TYPE]: {
      title: 'Alerting telemetry fetch task',
      type: TELEMETRY_TASK_TYPE,
      timeout: '5m',
      createTaskRunner: telemetryTaskRunner(logger, core, kibanaIndex),
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

export function telemetryTaskRunner(logger: Logger, core: CoreSetup, kibanaIndex: string) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    const callCluster = (...args: Parameters<LegacyAPICaller>) => {
      return core.getStartServices().then(([{ elasticsearch: { legacy: { client } } }]) =>
        client.callAsInternalUser(...args)
      );
    };

    return {
      async run() {
        return Promise.all([
          getTotalCountAggregations(callCluster, kibanaIndex),
          getTotalCountInUse(callCluster, kibanaIndex),
        ])
          .then(([totalCountAggregations, totalInUse]) => {
            return {
              state: {
                runs: (state.runs || 0) + 1,
                ...totalCountAggregations,
                count_active_by_type: totalInUse.countByType,
                count_active_total: totalInUse.countTotal,
                count_disabled_total: totalCountAggregations.count_total - totalInUse.countTotal,
              },
              runAt: getNextMidnight(),
            };
          })
          .catch((errMsg) => {
            logger.warn(`Error executing alerting telemetry task: ${errMsg}`);
            return {
              state: {},
              runAt: getNextMidnight(),
            };
          });
      },
    };
  };
}

function getNextMidnight() {
  return moment().add(1, 'd').startOf('d').toDate();
}
