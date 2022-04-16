/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { get } from 'lodash';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { ActionsUsage, byServiceProviderTypeSchema, byTypeSchema } from './types';
import { ActionsConfig } from '../config';

export function createActionsUsageCollector(
  usageCollection: UsageCollectionSetup,
  config: ActionsConfig,
  taskManager: Promise<TaskManagerStartContract>
) {
  return usageCollection.makeUsageCollector<ActionsUsage>({
    type: 'actions',
    isReady: async () => {
      await taskManager;
      return true;
    },
    schema: {
      alert_history_connector_enabled: {
        type: 'boolean',
        _meta: { description: 'Indicates if preconfigured alert history connector is enabled.' },
      },
      count_total: { type: 'long' },
      count_by_type: byTypeSchema,
      count_active_total: { type: 'long' },
      count_active_alert_history_connectors: {
        type: 'long',
        _meta: {
          description: 'The total number of preconfigured alert history connectors used by rules.',
        },
      },
      count_active_by_type: byTypeSchema,
      count_actions_executions_per_day: { type: 'long' },
      count_actions_executions_by_type_per_day: byTypeSchema,
      count_active_email_connectors_by_service_type: byServiceProviderTypeSchema,
      count_actions_namespaces: { type: 'long' },
      count_actions_executions_failed_per_day: { type: 'long' },
      count_actions_executions_failed_by_type_per_day: byTypeSchema,
      avg_execution_time_per_day: { type: 'long' },
      avg_execution_time_by_type_per_day: byTypeSchema,
    },
    fetch: async () => {
      try {
        const doc = await getLatestTaskState(await taskManager);
        // get the accumulated state from the recurring task
        const { runs, ...state } = get(doc, 'state') as ActionsUsage & { runs: number };

        return {
          ...state,
          alert_history_connector_enabled: config.preconfiguredAlertHistoryEsIndex,
        };
      } catch (err) {
        return {
          alert_history_connector_enabled: false,
          count_total: 0,
          count_by_type: {},
          count_active_total: 0,
          count_active_alert_history_connectors: 0,
          count_active_by_type: {},
          count_active_email_connectors_by_service_type: {},
          count_actions_namespaces: 0,
          count_actions_executions_per_day: 0,
          count_actions_executions_by_type_per_day: {},
          count_actions_executions_failed_per_day: 0,
          count_actions_executions_failed_by_type_per_day: {},
          avg_execution_time_per_day: 0,
          avg_execution_time_by_type_per_day: {},
        };
      }
    },
  });
}

async function getLatestTaskState(taskManager: TaskManagerStartContract) {
  try {
    const result = await taskManager.get('Actions-actions_telemetry');
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

export function registerActionsUsageCollector(
  usageCollection: UsageCollectionSetup,
  config: ActionsConfig,
  taskManager: Promise<TaskManagerStartContract>
) {
  const collector = createActionsUsageCollector(usageCollection, config, taskManager);
  usageCollection.registerCollector(collector);
}
