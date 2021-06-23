/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MakeSchemaFrom, UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { get } from 'lodash';
import { TaskManagerStartContract } from '../../../task_manager/server';
import { ActionsUsage } from './types';
import { ActionsConfig } from '../config';

const byTypeSchema: MakeSchemaFrom<ActionsUsage>['count_by_type'] = {
  // TODO: Find out an automated way to populate the keys or reformat these into an array (and change the Remote Telemetry indexer accordingly)
  DYNAMIC_KEY: { type: 'long' },
  // Known actions:
  __email: { type: 'long' },
  __index: { type: 'long' },
  __pagerduty: { type: 'long' },
  '__server-log': { type: 'long' },
  __slack: { type: 'long' },
  __webhook: { type: 'long' },
  __servicenow: { type: 'long' },
  __jira: { type: 'long' },
  __resilient: { type: 'long' },
  __teams: { type: 'long' },
};

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
      count_active_total: { type: 'long' },
      count_active_alert_history_connectors: {
        type: 'long',
        _meta: {
          description: 'The total number of preconfigured alert history connectors used by rules.',
        },
      },
      count_by_type: byTypeSchema,
      count_active_by_type: byTypeSchema,
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
          count_active_total: 0,
          count_active_alert_history_connectors: 0,
          count_active_by_type: {},
          count_by_type: {},
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
