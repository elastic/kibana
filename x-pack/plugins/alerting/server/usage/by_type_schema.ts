/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';

export const byTypeSchema: MakeSchemaFrom<Record<string, number>> = {
  // TODO: Find out an automated way to populate the keys or reformat these into an array (and change the Remote Telemetry indexer accordingly)
  DYNAMIC_KEY: { type: 'long' },
  // Known rule types (searching the use of the rules API `registerType`:
  // Built-in
  '__index-threshold': { type: 'long' },
  '__es-query': { type: 'long' },
  transform_health: { type: 'long' },
  // APM
  apm__anomaly: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  apm__error_rate: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  apm__transaction_error_rate: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  apm__transaction_duration: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  apm__transaction_duration_anomaly: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  // Infra
  metrics__alert__anomaly: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  metrics__alert__threshold: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  metrics__alert__inventory__threshold: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  logs__alert__document__count: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  // Monitoring
  monitoring_alert_cluster_health: { type: 'long' },
  monitoring_alert_cpu_usage: { type: 'long' },
  monitoring_alert_disk_usage: { type: 'long' },
  monitoring_alert_elasticsearch_version_mismatch: { type: 'long' },
  monitoring_alert_jvm_memory_usage: { type: 'long' },
  monitoring_alert_kibana_version_mismatch: { type: 'long' },
  monitoring_alert_license_expiration: { type: 'long' },
  monitoring_alert_logstash_version_mismatch: { type: 'long' },
  monitoring_alert_missing_monitoring_data: { type: 'long' },
  monitoring_alert_nodes_changed: { type: 'long' },
  monitoring_alert_thread_pool_search_rejections: { type: 'long' },
  monitoring_alert_thread_pool_write_rejections: { type: 'long' },
  monitoring_ccr_read_exceptions: { type: 'long' },
  monitoring_shard_size: { type: 'long' },
  // Security Solution
  siem__signals: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  siem__notifications: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  siem__eqlRule: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  siem__indicatorRule: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  siem__mlRule: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  siem__queryRule: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  siem__savedQueryRule: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  siem__thresholdRule: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  siem__newTermsRule: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  // Uptime
  xpack__uptime__alerts__monitorStatus: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  xpack__uptime__alerts__tls: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  xpack__uptime__alerts__durationAnomaly: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  // Maps
  '__geo-containment': { type: 'long' },
  // ML
  xpack__ml__anomaly_detection_alert: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  xpack__ml__anomaly_detection_jobs_health: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
  // Synthetics
  xpack__synthetics__alerts__monitorStatus: { type: 'long' }, // eslint-disable-line @typescript-eslint/naming-convention
};
