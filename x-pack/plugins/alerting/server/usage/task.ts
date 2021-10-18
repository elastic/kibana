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

import {
  getTotalCountAggregations,
  getTotalCountInUse,
  getTotalExecutionsCount,
} from './alerts_telemetry';

export const TELEMETRY_TASK_TYPE = 'alerting_telemetry';

export const TASK_ID = `Alerting-${TELEMETRY_TASK_TYPE}`;

export function initializeAlertingTelemetry(
  logger: Logger,
  core: CoreSetup,
  taskManager: TaskManagerSetupContract,
  kibanaIndex: string,
  eventLog: IEventLogService
) {
  registerAlertingTelemetryTask(logger, core, taskManager, kibanaIndex, eventLog);
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
  kibanaIndex: string,
  eventLog: IEventLogService
) {
  taskManager.registerTaskDefinitions({
    [TELEMETRY_TASK_TYPE]: {
      title: 'Alerting usage fetch task',
      timeout: '5s',
      createTaskRunner: telemetryTaskRunner(logger, core, kibanaIndex, eventLog),
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
          getTotalCountAggregations(esClient, kibanaIndex),
          getTotalCountInUse(esClient, kibanaIndex),
          getTotalExecutionsCount(esClient, eventLogIndex),
        ])
          .then(([totalCountAggregations, totalInUse, totalExecutions]) => {
            return {
              state: {
                runs: (state.runs || 0) + 1,
                ...totalCountAggregations,
                count_active_by_type: totalInUse.countByType,
                count_active_total: totalInUse.countTotal,
                count_disabled_total: totalCountAggregations.count_total - totalInUse.countTotal,
                count_rules_executions: totalExecutions.countByType,
                count_rules_executions_by_type: totalExecutions.countByType,
                count_rules_executions_failured: totalExecutions.countTotalFailures,
                count_rules_executions_failured_by_reason: totalExecutions.countFailuresByReason,
                count_rules_executions_failured_by_reason_by_type:
                  totalExecutions.countFailuresByReasonByType,
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
  return moment().add(1, 'm').startOf('m').toDate();
}
