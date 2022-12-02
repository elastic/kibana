/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MakeSchemaFrom, UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { get } from 'lodash';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { AlertingTelemetry } from './types';
import { byTypeSchema } from './by_type_schema';
import {
  EmptyEventLogUsage,
  EmptyEventLogUsageByType,
  EventLogUsageMapping,
} from './generated/event_log_telemetry_types';

export const NUM_ALERTING_RULE_TYPES = Object.keys(byTypeSchema).length;

const byReasonSchema: MakeSchemaFrom<AlertingTelemetry>['count_rules_executions_failured_by_reason_per_day'] =
  {
    // TODO: Find out an automated way to populate the keys or reformat these into an array (and change the Remote Telemetry indexer accordingly)
    DYNAMIC_KEY: { type: 'long' },
    read: { type: 'long' },
    decrypt: { type: 'long' },
    license: { type: 'long' },
    unknown: { type: 'long' },
  };

export const NUM_ALERTING_EXECUTION_FAILURE_REASON_TYPES = Object.keys(byReasonSchema).length;

const byReasonSchemaByType: MakeSchemaFrom<AlertingTelemetry>['count_rules_executions_failured_by_reason_by_type_per_day'] =
  {
    // TODO: Find out an automated way to populate the keys or reformat these into an array (and change the Remote Telemetry indexer accordingly)
    DYNAMIC_KEY: byTypeSchema,
    read: byTypeSchema,
    decrypt: byTypeSchema,
    license: byTypeSchema,
    unknown: byTypeSchema,
  };

const byTaskStatusSchema: MakeSchemaFrom<AlertingTelemetry>['count_failed_and_unrecognized_rule_tasks_by_status_per_day'] =
  {
    // TODO: Find out an automated way to populate the keys or reformat these into an array (and change the Remote Telemetry indexer accordingly)
    DYNAMIC_KEY: { type: 'long' },
    failed: { type: 'long' },
    unrecognized: { type: 'long' },
  };

const byTaskStatusSchemaByType: MakeSchemaFrom<AlertingTelemetry>['count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day'] =
  {
    // TODO: Find out an automated way to populate the keys or reformat these into an array (and change the Remote Telemetry indexer accordingly)
    DYNAMIC_KEY: byTypeSchema,
    failed: byTypeSchema,
    unrecognized: byTypeSchema,
  };

const byStatusSchema: MakeSchemaFrom<AlertingTelemetry>['count_rules_by_execution_status'] = {
  success: { type: 'long' },
  error: { type: 'long' },
  warning: { type: 'long' },
};

const byStatusPerDaySchema: MakeSchemaFrom<AlertingTelemetry>['count_rules_by_execution_status_per_day'] =
  {
    success: { type: 'long' },
    failure: { type: 'long' },
    unknown: { type: 'long' },
  };

const byNotifyWhenSchema: MakeSchemaFrom<AlertingTelemetry>['count_rules_by_notify_when'] = {
  on_action_group_change: { type: 'long' },
  on_active_alert: { type: 'long' },
  on_throttle_interval: { type: 'long' },
};

export interface PercentileValueSchema {
  p50: number;
  p90: number;
  p99: number;
}
export interface PercentileValueByTypeSchema {
  p50: Record<string, number>;
  p90: Record<string, number>;
  p99: Record<string, number>;
}

export function createAlertingUsageCollector(
  usageCollection: UsageCollectionSetup,
  taskManager: Promise<TaskManagerStartContract>
) {
  return usageCollection.makeUsageCollector<AlertingTelemetry>({
    type: 'alerts',
    isReady: async () => {
      await taskManager;
      return true;
    },
    fetch: async () => {
      try {
        const doc = await getLatestTaskState(await taskManager);
        // get the accumulated state from the recurring task
        const { runs, ...state } = get(doc, 'state') as AlertingTelemetry & { runs: number };

        return state;
      } catch (err) {
        const errMessage = err && err.message ? err.message : err.toString();
        return {
          has_errors: true,
          error_messages: [errMessage],
          count_total: 0,
          count_active_total: 0,
          count_disabled_total: 0,
          throttle_time: {
            min: '0s',
            avg: '0s',
            max: '0s',
          },
          schedule_time: {
            min: '0s',
            avg: '0s',
            max: '0s',
          },
          throttle_time_number_s: {
            min: 0,
            avg: 0,
            max: 0,
          },
          schedule_time_number_s: {
            min: 0,
            avg: 0,
            max: 0,
          },
          connectors_per_alert: {
            min: 0,
            avg: 0,
            max: 0,
          },
          count_active_by_type: {},
          count_by_type: {},
          count_rules_namespaces: 0,
          count_rules_executions_per_day: 0,
          count_rules_executions_by_type_per_day: {},
          count_rules_executions_failured_per_day: 0,
          count_rules_executions_failured_by_reason_per_day: {},
          count_rules_executions_failured_by_reason_by_type_per_day: {},
          count_rules_executions_timeouts_per_day: 0,
          count_rules_executions_timeouts_by_type_per_day: {},
          count_failed_and_unrecognized_rule_tasks_per_day: 0,
          count_failed_and_unrecognized_rule_tasks_by_status_per_day: {},
          count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day: {},
          count_rules_by_execution_status: {
            success: 0,
            warning: 0,
            error: 0,
          },
          count_rules_by_notify_when: {
            on_action_group_change: 0,
            on_active_alert: 0,
            on_throttle_interval: 0,
          },
          count_rules_with_tags: 0,
          count_rules_snoozed: 0,
          count_rules_muted: 0,
          count_rules_with_muted_alerts: 0,
          count_connector_types_by_consumers: {},
          count_rules_by_execution_status_per_day: {},
          ...EmptyEventLogUsage,
          ...EmptyEventLogUsageByType,
        };
      }
    },
    schema: {
      has_errors: { type: 'boolean' },
      error_messages: {
        type: 'array',
        items: { type: 'text' },
      },
      count_total: { type: 'long' },
      count_active_total: { type: 'long' },
      count_disabled_total: { type: 'long' },
      throttle_time: {
        min: { type: 'keyword' },
        avg: { type: 'keyword' },
        max: { type: 'keyword' },
      },
      schedule_time: {
        min: { type: 'keyword' },
        avg: { type: 'keyword' },
        max: { type: 'keyword' },
      },
      throttle_time_number_s: {
        min: { type: 'long' },
        avg: { type: 'float' },
        max: { type: 'long' },
      },
      schedule_time_number_s: {
        min: { type: 'long' },
        avg: { type: 'float' },
        max: { type: 'long' },
      },
      connectors_per_alert: {
        min: { type: 'long' },
        avg: { type: 'float' },
        max: { type: 'long' },
      },
      count_active_by_type: byTypeSchema,
      count_by_type: byTypeSchema,
      count_rules_namespaces: { type: 'long' },
      count_rules_executions_per_day: { type: 'long' },
      count_rules_executions_by_type_per_day: byTypeSchema,
      count_rules_executions_failured_per_day: { type: 'long' },
      count_rules_executions_failured_by_reason_per_day: byReasonSchema,
      count_rules_executions_failured_by_reason_by_type_per_day: byReasonSchemaByType,
      count_rules_executions_timeouts_per_day: { type: 'long' },
      count_rules_executions_timeouts_by_type_per_day: byTypeSchema,
      count_failed_and_unrecognized_rule_tasks_per_day: { type: 'long' },
      count_failed_and_unrecognized_rule_tasks_by_status_per_day: byTaskStatusSchema,
      count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day: byTaskStatusSchemaByType,
      count_rules_by_execution_status: byStatusSchema,
      count_rules_with_tags: { type: 'long' },
      count_rules_by_notify_when: byNotifyWhenSchema,
      count_rules_snoozed: { type: 'long' },
      count_rules_muted: { type: 'long' },
      count_rules_with_muted_alerts: { type: 'long' },
      count_connector_types_by_consumers: { DYNAMIC_KEY: { DYNAMIC_KEY: { type: 'long' } } },
      count_rules_by_execution_status_per_day: byStatusPerDaySchema,
      ...EventLogUsageMapping,
    },
  });
}

async function getLatestTaskState(taskManager: TaskManagerStartContract) {
  try {
    const result = await taskManager.get('Alerting-alerting_telemetry');
    return result;
  } catch (err) {
    const errMessage = err && err.message ? err.message : err.toString();
    /*
      The usage service WILL to try to fetch from this collector before the task manager has been initialized, because the
      task manager has to wait for all plugins to initialize first. It's fine to ignore it as next time around it will be
      initialized (or it will throw a different type of error)
    */
    if (!errMessage.includes('NotInitialized')) {
      throw err;
    }
  }

  return null;
}

export function registerAlertingUsageCollector(
  usageCollection: UsageCollectionSetup,
  taskManager: Promise<TaskManagerStartContract>
) {
  const collector = createAlertingUsageCollector(usageCollection, taskManager);
  usageCollection.registerCollector(collector);
}
