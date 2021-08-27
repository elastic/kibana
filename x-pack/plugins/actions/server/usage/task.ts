/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/logging';
import moment from 'moment';
import type { CoreSetup } from '../../../../../src/core/server';
import type { SavedObjectsBulkGetObject } from '../../../../../src/core/server/saved_objects/service/saved_objects_client';
import type { SavedObjectsBaseOptions } from '../../../../../src/core/server/saved_objects/types';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../task_manager/server/plugin';
import type { RunContext } from '../../../task_manager/server/task';
import type { ActionResult } from '../types';
import { getInUseTotalCount, getTotalCount } from './actions_telemetry';

export const TELEMETRY_TASK_TYPE = 'actions_telemetry';

export const TASK_ID = `Actions-${TELEMETRY_TASK_TYPE}`;

export function initializeActionsTelemetry(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  core: CoreSetup,
  kibanaIndex: string
) {
  registerActionsTelemetryTask(logger, taskManager, core, kibanaIndex);
}

export function scheduleActionsTelemetry(logger: Logger, taskManager: TaskManagerStartContract) {
  scheduleTasks(logger, taskManager);
}

function registerActionsTelemetryTask(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  core: CoreSetup,
  kibanaIndex: string
) {
  taskManager.registerTaskDefinitions({
    [TELEMETRY_TASK_TYPE]: {
      title: 'Actions usage fetch task',
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
      state: {},
      params: {},
    });
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}

export function telemetryTaskRunner(logger: Logger, core: CoreSetup, kibanaIndex: string) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    const getEsClient = () =>
      core.getStartServices().then(
        ([
          {
            elasticsearch: { client },
          },
        ]) => client.asInternalUser
      );
    const actionsBulkGet = (
      objects?: SavedObjectsBulkGetObject[],
      options?: SavedObjectsBaseOptions
    ) => {
      return core
        .getStartServices()
        .then(([{ savedObjects }]) =>
          savedObjects.createInternalRepository(['action']).bulkGet<ActionResult>(objects, options)
        );
    };
    return {
      async run() {
        const esClient = await getEsClient();
        return Promise.all([
          getTotalCount(esClient, kibanaIndex),
          getInUseTotalCount(esClient, actionsBulkGet, kibanaIndex),
        ])
          .then(([totalAggegations, totalInUse]) => {
            return {
              state: {
                runs: (state.runs || 0) + 1,
                count_total: totalAggegations.countTotal,
                count_by_type: totalAggegations.countByType,
                count_active_total: totalInUse.countTotal,
                count_active_by_type: totalInUse.countByType,
                count_active_alert_history_connectors: totalInUse.countByAlertHistoryConnectorType,
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
