/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, CoreSetup, LegacyAPICaller } from 'kibana/server';
import moment from 'moment';
import { first } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../task_manager/server';
import { getTotalCount, getInUseTotalCount } from './actions_telemetry';

export const TELEMETRY_TASK_TYPE = 'actions_telemetry';

export const TASK_ID = `Actions-${TELEMETRY_TASK_TYPE}`;

export function initializeActionsTelemetry(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  core: CoreSetup,
  config: Observable<{ kibana: { index: string } }>
) {
  registerActionsTelemetryTask(logger, taskManager, core, config);
}

export function scheduleActionsTelemetry(logger: Logger, taskManager: TaskManagerStartContract) {
  scheduleTasks(logger, taskManager);
}

function registerActionsTelemetryTask(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  core: CoreSetup,
  config: Observable<{ kibana: { index: string } }>
) {
  taskManager.registerTaskDefinitions({
    [TELEMETRY_TASK_TYPE]: {
      title: 'Actions usage fetch task',
      timeout: '5m',
      createTaskRunner: telemetryTaskRunner(logger, core, config),
    },
  });
}

async function scheduleTasks(logger: Logger, taskManager: TaskManagerStartContract) {
  try {
    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TELEMETRY_TASK_TYPE,
      state: {},
      params: {},
    });
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}

export function telemetryTaskRunner(
  logger: Logger,
  core: CoreSetup,
  config: Observable<{ kibana: { index: string } }>
) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    const callCluster = (...args: Parameters<LegacyAPICaller>) => {
      return core.getStartServices().then(([{ elasticsearch: { legacy: { client } } }]) =>
        client.callAsInternalUser(...args)
      );
    };
    return {
      async run() {
        const kibanaIndex = (await config.pipe(first()).toPromise()).kibana.index;
        return Promise.all([
          getTotalCount(callCluster, kibanaIndex),
          getInUseTotalCount(callCluster, kibanaIndex),
        ])
          .then(([totalAggegations, countActiveTotal]) => {
            return {
              state: {
                runs: (state.runs || 0) + 1,
                count_total: totalAggegations.countTotal,
                count_by_type: totalAggegations.countByType,
                count_active_total: countActiveTotal,
              },
              runAt: getNextMidnight(),
            };
          })
          .catch((errMsg) => {
            logger.warn(`Error executing actions telemetry task: ${errMsg}`);
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
