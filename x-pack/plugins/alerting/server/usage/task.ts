/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, CoreSetup } from '@kbn/core/server';
import moment from 'moment';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import {
  getTotalCountAggregations,
  getTotalCountInUse,
  getExecutionsPerDayCount,
  getExecutionTimeoutsPerDayCount,
  getFailedAndUnrecognizedTasksPerDay,
} from './alerting_telemetry';

export const TELEMETRY_TASK_TYPE = 'alerting_telemetry';

export const TASK_ID = `Alerting-${TELEMETRY_TASK_TYPE}`;

export function initializeAlertingTelemetry(
  logger: Logger,
  core: CoreSetup,
  taskManager: TaskManagerSetupContract,
  kibanaIndex: string,
  eventLogIndex: string
) {
  registerAlertingTelemetryTask(logger, core, taskManager, kibanaIndex, eventLogIndex);
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
  eventLogIndex: string
) {
  taskManager.registerTaskDefinitions({
    [TELEMETRY_TASK_TYPE]: {
      title: 'Alerting usage fetch task',
      timeout: '5m',
      createTaskRunner: telemetryTaskRunner(
        logger,
        core,
        kibanaIndex,
        eventLogIndex,
        taskManager.index
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
  eventLogIndex: string,
  taskManagerIndex: string
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

    return {
      async run() {
        const esClient = await getEsClient();
        return Promise.all([
          getTotalCountAggregations(esClient, kibanaIndex),
          getTotalCountInUse(esClient, kibanaIndex),
          getExecutionsPerDayCount(esClient, eventLogIndex),
          getExecutionTimeoutsPerDayCount(esClient, eventLogIndex),
          getFailedAndUnrecognizedTasksPerDay(esClient, taskManagerIndex),
        ])
          .then(
            ([
              totalCountAggregations,
              totalInUse,
              dailyExecutionCounts,
              dailyExecutionTimeoutCounts,
              dailyFailedAndUnrecognizedTasks,
            ]) => {
              return {
                state: {
                  runs: (state.runs || 0) + 1,
                  ...totalCountAggregations,
                  count_active_by_type: totalInUse.countByType,
                  count_active_total: totalInUse.countTotal,
                  count_disabled_total: totalCountAggregations.count_total - totalInUse.countTotal,
                  count_rules_namespaces: totalInUse.countNamespaces,
                  count_rules_executions_per_day: dailyExecutionCounts.countTotal,
                  count_rules_executions_by_type_per_day: dailyExecutionCounts.countByType,
                  count_rules_executions_failured_per_day: dailyExecutionCounts.countTotalFailures,
                  count_rules_executions_failured_by_reason_per_day:
                    dailyExecutionCounts.countFailuresByReason,
                  count_rules_executions_failured_by_reason_by_type_per_day:
                    dailyExecutionCounts.countFailuresByReasonByType,
                  count_rules_executions_timeouts_per_day: dailyExecutionTimeoutCounts.countTotal,
                  count_rules_executions_timeouts_by_type_per_day:
                    dailyExecutionTimeoutCounts.countByType,
                  count_failed_and_unrecognized_rule_tasks_per_day:
                    dailyFailedAndUnrecognizedTasks.countTotal,
                  count_failed_and_unrecognized_rule_tasks_by_status_per_day:
                    dailyFailedAndUnrecognizedTasks.countByStatus,
                  count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day:
                    dailyFailedAndUnrecognizedTasks.countByStatusByRuleType,
                  avg_execution_time_per_day: dailyExecutionCounts.avgExecutionTime,
                  avg_execution_time_by_type_per_day: dailyExecutionCounts.avgExecutionTimeByType,
                  avg_es_search_duration_per_day: dailyExecutionCounts.avgEsSearchDuration,
                  avg_es_search_duration_by_type_per_day:
                    dailyExecutionCounts.avgEsSearchDurationByType,
                  avg_total_search_duration_per_day: dailyExecutionCounts.avgTotalSearchDuration,
                  avg_total_search_duration_by_type_per_day:
                    dailyExecutionCounts.avgTotalSearchDurationByType,
                  percentile_num_generated_actions_per_day:
                    dailyExecutionCounts.generatedActionsPercentiles,
                  percentile_num_generated_actions_by_type_per_day:
                    dailyExecutionCounts.generatedActionsPercentilesByType,
                },
                runAt: getNextMidnight(),
              };
            }
          )
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
