/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_FEATURE_ID } from './types';

export const ruleTypeIdWithValidLegacyConsumers: Record<string, string[]> = {
  'example.always-firing': [ALERTING_FEATURE_ID],
  'example.people-in-space': [ALERTING_FEATURE_ID],
  transform_health: [ALERTING_FEATURE_ID],
  '.index-threshold': [ALERTING_FEATURE_ID],
  '.geo-containment': [ALERTING_FEATURE_ID],
  '.es-query': [ALERTING_FEATURE_ID, 'discover'],
  'xpack.ml.anomaly_detection_alert': [ALERTING_FEATURE_ID],
  'xpack.ml.anomaly_detection_jobs_health': [ALERTING_FEATURE_ID],
  'xpack.synthetics.alerts.monitorStatus': [ALERTING_FEATURE_ID],
  'xpack.synthetics.alerts.tls': [ALERTING_FEATURE_ID],
  'xpack.uptime.alerts.monitorStatus': [ALERTING_FEATURE_ID],
  'xpack.uptime.alerts.tlsCertificate': [ALERTING_FEATURE_ID],
  'xpack.uptime.alerts.durationAnomaly': [ALERTING_FEATURE_ID],
  'xpack.uptime.alerts.tls': [ALERTING_FEATURE_ID],
  'siem.eqlRule': [ALERTING_FEATURE_ID],
  'siem.savedQueryRule': [ALERTING_FEATURE_ID],
  'siem.indicatorRule': [ALERTING_FEATURE_ID],
  'siem.mlRule': [ALERTING_FEATURE_ID],
  'siem.queryRule': [ALERTING_FEATURE_ID],
  'siem.thresholdRule': [ALERTING_FEATURE_ID],
  'siem.newTermsRule': [ALERTING_FEATURE_ID],
  'siem.notifications': [ALERTING_FEATURE_ID],
  'slo.rules.burnRate': [ALERTING_FEATURE_ID],
  'logs.alert.document.count': [ALERTING_FEATURE_ID],
  'metrics.alert.inventory.threshold': [ALERTING_FEATURE_ID],
  'metrics.alert.threshold': [ALERTING_FEATURE_ID],
  monitoring_alert_cluster_health: [ALERTING_FEATURE_ID],
  monitoring_alert_license_expiration: [ALERTING_FEATURE_ID],
  monitoring_alert_cpu_usage: [ALERTING_FEATURE_ID],
  monitoring_alert_missing_monitoring_data: [ALERTING_FEATURE_ID],
  monitoring_alert_disk_usage: [ALERTING_FEATURE_ID],
  monitoring_alert_thread_pool_search_rejections: [ALERTING_FEATURE_ID],
  monitoring_alert_thread_pool_write_rejections: [ALERTING_FEATURE_ID],
  monitoring_alert_jvm_memory_usage: [ALERTING_FEATURE_ID],
  monitoring_alert_nodes_changed: [ALERTING_FEATURE_ID],
  monitoring_alert_logstash_version_mismatch: [ALERTING_FEATURE_ID],
  monitoring_alert_kibana_version_mismatch: [ALERTING_FEATURE_ID],
  monitoring_alert_elasticsearch_version_mismatch: [ALERTING_FEATURE_ID],
  monitoring_ccr_read_exceptions: [ALERTING_FEATURE_ID],
  monitoring_shard_size: [ALERTING_FEATURE_ID],
  'apm.transaction_duration': [ALERTING_FEATURE_ID],
  'apm.anomaly': [ALERTING_FEATURE_ID],
  'apm.error_rate': [ALERTING_FEATURE_ID],
  'apm.transaction_error_rate': [ALERTING_FEATURE_ID],
  'test.always-firing': [ALERTING_FEATURE_ID],
  'test.always-firing-alert-as-data': [ALERTING_FEATURE_ID],
  'test.authorization': [ALERTING_FEATURE_ID],
  'test.cancellableRule': [ALERTING_FEATURE_ID],
  'test.cumulative-firing': [ALERTING_FEATURE_ID],
  'test.exceedsAlertLimit': [ALERTING_FEATURE_ID],
  'test.failing': [ALERTING_FEATURE_ID],
  'test.gold.noop': [ALERTING_FEATURE_ID],
  'test.longRunning': [ALERTING_FEATURE_ID],
  'test.multipleSearches': [ALERTING_FEATURE_ID],
  'test.never-firing': [ALERTING_FEATURE_ID],
  'test.noop': [ALERTING_FEATURE_ID],
  'test.onlyContextVariables': [ALERTING_FEATURE_ID],
  'test.onlyStateVariables': [ALERTING_FEATURE_ID],
  'test.patternFiring': [ALERTING_FEATURE_ID],
  'test.patternFiringAad': [ALERTING_FEATURE_ID],
  'test.patternFiringAutoRecoverFalse': [ALERTING_FEATURE_ID],
  'test.patternLongRunning': [ALERTING_FEATURE_ID],
  'test.patternLongRunning.cancelAlertsOnRuleTimeout': [ALERTING_FEATURE_ID],
  'test.patternSuccessOrFailure': [ALERTING_FEATURE_ID],
  'test.restricted-noop': [ALERTING_FEATURE_ID],
  'test.throw': [ALERTING_FEATURE_ID],
  'test.unrestricted-noop': [ALERTING_FEATURE_ID],
  'test.validation': [ALERTING_FEATURE_ID],
};

const getRuleTypeIdValidLegacyConsumers = (ruleTypeId: string): string[] => {
  if (ruleTypeIdWithValidLegacyConsumers[ruleTypeId]) {
    return ruleTypeIdWithValidLegacyConsumers[ruleTypeId];
  }
  return [];
};

export { getRuleTypeIdValidLegacyConsumers };
