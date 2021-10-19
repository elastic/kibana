/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, CoreSetup } from 'kibana/server';
import moment from 'moment';
import { IEventLogService } from '../../../event_log/server';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../task_manager/server';
import { PreConfiguredAction } from '../types';
import { getTotalCount, getInUseTotalCount, getExecutionsTotalCount } from './actions_telemetry';

export const TELEMETRY_TASK_TYPE = 'actions_telemetry';

export const TASK_ID = `Actions-${TELEMETRY_TASK_TYPE}`;

export function initializeActionsTelemetry(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  core: CoreSetup,
  kibanaIndex: string,
  preconfiguredActions: PreConfiguredAction[],
  eventLog: IEventLogService
) {
  registerActionsTelemetryTask(
    logger,
    taskManager,
    core,
    kibanaIndex,
    preconfiguredActions,
    eventLog
  );
}

export function scheduleActionsTelemetry(logger: Logger, taskManager: TaskManagerStartContract) {
  scheduleTasks(logger, taskManager);
}

function registerActionsTelemetryTask(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  core: CoreSetup,
  kibanaIndex: string,
  preconfiguredActions: PreConfiguredAction[],
  eventLog: IEventLogService
) {
  taskManager.registerTaskDefinitions({
    [TELEMETRY_TASK_TYPE]: {
      title: 'Actions usage fetch task',
      timeout: '5s',
      createTaskRunner: telemetryTaskRunner(
        logger,
        core,
        kibanaIndex,
        preconfiguredActions,
        eventLog
      ),
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
  kibanaIndex: string,
  preconfiguredActions: PreConfiguredAction[],
  eventLog: IEventLogService
) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    const eventLogIndex = eventLog.getIndexPatterns();
    const getEsClient = () =>
      core.getStartServices().then(
        ([
          {
            elasticsearch: { client },
          },
        ]) => client.asInternalUser
      );
    return {
      async run() {
        const esClient = await getEsClient();
        return Promise.all([
          getTotalCount(esClient, kibanaIndex, preconfiguredActions),
          getInUseTotalCount(esClient, kibanaIndex),
          getExecutionsTotalCount(esClient, eventLogIndex),
        ])
          .then(([totalAggegations, totalInUse, totalExecutions]) => {
            return {
              state: {
                runs: (state.runs || 0) + 1,
                count_total: totalAggegations.countTotal,
                count_by_type: totalAggegations.countByType,
                count_active_total: totalInUse.countTotal,
                count_active_by_type: totalInUse.countByType,
                count_active_alert_history_connectors: totalInUse.countByAlertHistoryConnectorType,
                count_actions_executions: totalExecutions.countTotal,
                count_actions_executions_by_type: totalExecutions.countByType,
                count_actions_executions_failured: totalExecutions.countFailures,
                count_actions_executions_failured_by_type: totalExecutions.countFailuresByType,
                avg_execution_time: totalExecutions.avgExecutionTime,
                avg_execution_time_by_type: totalExecutions.avgExecutionTimeByType,
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
  return moment().add(1, 'm').startOf('m').toDate();
}
