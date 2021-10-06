/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MakeSchemaFrom, UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { get } from 'lodash';
import { TaskManagerStartContract } from '../../../task_manager/server';
import { AlertsUsage } from './types';

const byTypeSchema: MakeSchemaFrom<AlertsUsage>['count_by_type'] = {
  // TODO: Find out an automated way to populate the keys or reformat these into an array (and change the Remote Telemetry indexer accordingly)
  DYNAMIC_KEY: { type: 'long' },
  // Known alerts (searching the use of the alerts API `registerType`:
  // Built-in
  '__index-threshold': { type: 'long' },
  '__es-query': { type: 'long' },
  transform_health: { type: 'long' },
  // APM
  apm__error_rate: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  apm__transaction_error_rate: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  apm__transaction_duration: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  apm__transaction_duration_anomaly: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  // Infra
  metrics__alert__threshold: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  metrics__alert__inventory__threshold: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  logs__alert__document__count: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  // Monitoring
  monitoring_alert_cluster_health: { type: 'long' },
  monitoring_alert_cpu_usage: { type: 'long' },
  monitoring_alert_disk_usage: { type: 'long' },
  monitoring_alert_elasticsearch_version_mismatch: { type: 'long' },
  monitoring_alert_kibana_version_mismatch: { type: 'long' },
  monitoring_alert_license_expiration: { type: 'long' },
  monitoring_alert_logstash_version_mismatch: { type: 'long' },
  monitoring_alert_nodes_changed: { type: 'long' },
  // Security Solution
  siem__signals: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  siem__notifications: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  // Uptime
  xpack__uptime__alerts__monitorStatus: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  xpack__uptime__alerts__tls: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  xpack__uptime__alerts__durationAnomaly: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  // Maps
  '__geo-containment': { type: 'long' },
  // ML
  xpack__ml__anomaly_detection_alert: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  xpack__ml__anomaly_detection_jobs_health: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
};

export function createAlertsUsageCollector(
  usageCollection: UsageCollectionSetup,
  taskManager: Promise<TaskManagerStartContract>
) {
  return usageCollection.makeUsageCollector<AlertsUsage>({
    type: 'alerts',
    isReady: async () => {
      await taskManager;
      return true;
    },
    fetch: async () => {
      try {
        const doc = await getLatestTaskState(await taskManager);
        // get the accumulated state from the recurring task
        const { runs, ...state } = get(doc, 'state') as AlertsUsage & { runs: number };

        return {
          ...state,
        };
      } catch (err) {
        return {
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
    schema: {
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
      connectors_per_alert: {
        min: { type: 'long' },
        avg: { type: 'float' },
        max: { type: 'long' },
      },
      count_active_by_type: byTypeSchema,
      count_by_type: byTypeSchema,
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
  taskManager: Promise<TaskManagerStartContract>
) {
  const collector = createAlertsUsageCollector(usageCollection, taskManager);
  usageCollection.registerCollector(collector);
}
