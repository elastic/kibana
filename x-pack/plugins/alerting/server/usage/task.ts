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

import { getFailedAndUnrecognizedTasksPerDay } from './lib/get_telemetry_from_task_manager';
import { getTotalCountAggregations, getTotalCountInUse } from './lib/get_telemetry_from_kibana';
import {
  getExecutionsPerDayCount,
  getExecutionTimeoutsPerDayCount,
} from './lib/get_telemetry_from_event_log';

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
          getTotalCountAggregations({ esClient, kibanaIndex, logger }),
          getTotalCountInUse({ esClient, kibanaIndex, logger }),
          getExecutionsPerDayCount({ esClient, eventLogIndex, logger }),
          getExecutionTimeoutsPerDayCount({ esClient, eventLogIndex, logger }),
          getFailedAndUnrecognizedTasksPerDay({ esClient, taskManagerIndex, logger }),
        ])
          .then(
            ([
              totalCountAggregations,
              totalInUse,
              dailyExecutionCounts,
              dailyExecutionTimeoutCounts,
              dailyFailedAndUnrecognizedTasks,
            ]) => {
              const hasErrors =
                totalCountAggregations.hasErrors ||
                totalInUse.hasErrors ||
                dailyExecutionCounts.hasErrors ||
                dailyExecutionTimeoutCounts.hasErrors ||
                dailyFailedAndUnrecognizedTasks.hasErrors;

              const errorMessages = [
                totalCountAggregations.errorMessage,
                totalInUse.errorMessage,
                dailyExecutionCounts.errorMessage,
                dailyExecutionTimeoutCounts.errorMessage,
                dailyFailedAndUnrecognizedTasks.errorMessage,
              ].filter((message) => message !== undefined);

              return {
                state: {
                  has_errors: hasErrors,
                  ...(errorMessages.length > 0 && { error_messages: errorMessages }),
                  runs: (state.runs || 0) + 1,
                  count_total: totalCountAggregations.count_total,
                  count_by_type: totalCountAggregations.count_by_type,
                  throttle_time: totalCountAggregations.throttle_time,
                  schedule_time: totalCountAggregations.schedule_time,
                  throttle_time_number_s: totalCountAggregations.throttle_time_number_s,
                  schedule_time_number_s: totalCountAggregations.schedule_time_number_s,
                  connectors_per_alert: totalCountAggregations.connectors_per_alert,
                  count_active_by_type: totalInUse.countByType,
                  count_active_total: totalInUse.countTotal,
                  count_disabled_total: totalCountAggregations.count_total - totalInUse.countTotal,
                  count_rules_by_execution_status:
                    totalCountAggregations.count_rules_by_execution_status,
                  count_rules_with_tags: totalCountAggregations.count_rules_with_tags,
                  count_rules_by_notify_when: totalCountAggregations.count_rules_by_notify_when,
                  count_rules_snoozed: totalCountAggregations.count_rules_snoozed,
                  count_rules_muted: totalCountAggregations.count_rules_muted,
                  count_rules_with_muted_alerts:
                    totalCountAggregations.count_rules_with_muted_alerts,
                  count_connector_types_by_consumers:
                    totalCountAggregations.count_connector_types_by_consumers,
                  count_rules_namespaces: totalInUse.countNamespaces,
                  count_rules_executions_per_day: dailyExecutionCounts.countTotalRuleExecutions,
                  count_rules_executions_by_type_per_day:
                    dailyExecutionCounts.countRuleExecutionsByType,
                  count_rules_executions_failured_per_day:
                    dailyExecutionCounts.countTotalFailedExecutions,
                  count_rules_executions_failured_by_reason_per_day:
                    dailyExecutionCounts.countFailedExecutionsByReason,
                  count_rules_executions_failured_by_reason_by_type_per_day:
                    dailyExecutionCounts.countFailedExecutionsByReasonByType,
                  count_rules_by_execution_status_per_day:
                    dailyExecutionCounts.countRulesByExecutionStatus,
                  count_rules_executions_timeouts_per_day:
                    dailyExecutionTimeoutCounts.countExecutionTimeouts,
                  count_rules_executions_timeouts_by_type_per_day:
                    dailyExecutionTimeoutCounts.countExecutionTimeoutsByType,
                  count_failed_and_unrecognized_rule_tasks_per_day:
                    dailyFailedAndUnrecognizedTasks.countFailedAndUnrecognizedTasks,
                  count_failed_and_unrecognized_rule_tasks_by_status_per_day:
                    dailyFailedAndUnrecognizedTasks.countFailedAndUnrecognizedTasksByStatus,
                  count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day:
                    dailyFailedAndUnrecognizedTasks.countFailedAndUnrecognizedTasksByStatusByType,
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
                  percentile_num_alerts_per_day: dailyExecutionCounts.alertsPercentiles,
                  percentile_num_alerts_by_type_per_day:
                    dailyExecutionCounts.alertsPercentilesByType,
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
