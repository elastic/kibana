/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, CoreSetup } from '@kbn/core/server';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  IntervalSchedule,
} from '@kbn/task-manager-plugin/server';
import { PreConfiguredAction } from '../types';
import { getTotalCount, getInUseTotalCount, getExecutionsPerDayCount } from './actions_telemetry';

export const TELEMETRY_TASK_TYPE = 'actions_telemetry';

export const TASK_ID = `Actions-${TELEMETRY_TASK_TYPE}`;
export const SCHEDULE: IntervalSchedule = { interval: '1d' };

export function initializeActionsTelemetry(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  core: CoreSetup,
  preconfiguredActions: PreConfiguredAction[],
  eventLogIndex: string
) {
  registerActionsTelemetryTask(logger, taskManager, core, preconfiguredActions, eventLogIndex);
}

export function scheduleActionsTelemetry(logger: Logger, taskManager: TaskManagerStartContract) {
  scheduleTasks(logger, taskManager);
}

function registerActionsTelemetryTask(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  core: CoreSetup,
  preconfiguredActions: PreConfiguredAction[],
  eventLogIndex: string
) {
  taskManager.registerTaskDefinitions({
    [TELEMETRY_TASK_TYPE]: {
      title: 'Actions usage fetch task',
      timeout: '5m',
      createTaskRunner: telemetryTaskRunner(logger, core, preconfiguredActions, eventLogIndex),
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
      schedule: SCHEDULE,
    });
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}

export function telemetryTaskRunner(
  logger: Logger,
  core: CoreSetup,
  preconfiguredActions: PreConfiguredAction[],
  eventLogIndex: string
) {
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
    const getActionIndex = () =>
      core
        .getStartServices()
        .then(([coreStart]) => coreStart.savedObjects.getIndexForType('action'));
    return {
      async run() {
        const actionIndex = await getActionIndex();
        const esClient = await getEsClient();
        return Promise.all([
          getTotalCount(esClient, actionIndex, logger, preconfiguredActions),
          getInUseTotalCount(esClient, actionIndex, logger, undefined, preconfiguredActions),
          getExecutionsPerDayCount(esClient, eventLogIndex, logger),
        ]).then(([totalAggegations, totalInUse, totalExecutionsPerDay]) => {
          const hasErrors =
            totalAggegations.hasErrors || totalInUse.hasErrors || totalExecutionsPerDay.hasErrors;

          const errorMessages = [
            totalAggegations.errorMessage,
            totalInUse.errorMessage,
            totalExecutionsPerDay.errorMessage,
          ].filter((message) => message !== undefined);

          return {
            state: {
              has_errors: hasErrors,
              ...(errorMessages.length > 0 && { error_messages: errorMessages }),
              runs: (state.runs || 0) + 1,
              count_total: totalAggegations.countTotal,
              count_by_type: totalAggegations.countByType,
              count_active_total: totalInUse.countTotal,
              count_active_by_type: totalInUse.countByType,
              count_active_alert_history_connectors: totalInUse.countByAlertHistoryConnectorType,
              count_active_email_connectors_by_service_type: totalInUse.countEmailByService,
              count_actions_namespaces: totalInUse.countNamespaces,
              count_actions_executions_per_day: totalExecutionsPerDay.countTotal,
              count_actions_executions_by_type_per_day: totalExecutionsPerDay.countByType,
              count_actions_executions_failed_per_day: totalExecutionsPerDay.countFailed,
              count_actions_executions_failed_by_type_per_day:
                totalExecutionsPerDay.countFailedByType,
              avg_execution_time_per_day: totalExecutionsPerDay.avgExecutionTime,
              avg_execution_time_by_type_per_day: totalExecutionsPerDay.avgExecutionTimeByType,
              count_connector_types_by_action_run_outcome_per_day:
                totalExecutionsPerDay.countRunOutcomeByConnectorType,
            },
            // Useful for setting a schedule for the old tasks that don't have one
            // or to update the schedule if ever the frequency changes in code
            schedule: SCHEDULE,
          };
        });
      },
    };
  };
}
