/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { get } from 'lodash';
import { TaskManagerStartContract } from '../../../task_manager/server';
import { AlertsUsage } from './types';

export function createAlertsUsageCollector(
  usageCollection: UsageCollectionSetup,
  taskManager: TaskManagerStartContract
) {
  return usageCollection.makeUsageCollector<AlertsUsage>({
    type: 'alerts',
    isReady: () => true,
    fetch: async () => {
      try {
        const doc = await getLatestTaskState(await taskManager);
        // get the accumulated state from the recurring task
        const state: AlertsUsage = get(doc, 'state') as AlertsUsage;

        return {
          ...state,
        };
      } catch (err) {
        return {
          count_total: 0,
          count_active_total: 0,
          count_disabled_total: 0,
          throttle_time: {
            min: 0,
            avg: 0,
            max: 0,
          },
          schedule_time: {
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
        };
      }
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

export function registerAlertsUsageCollector(
  usageCollection: UsageCollectionSetup,
  taskManager: TaskManagerStartContract
) {
  const collector = createAlertsUsageCollector(usageCollection, taskManager);
  usageCollection.registerCollector(collector);
}
