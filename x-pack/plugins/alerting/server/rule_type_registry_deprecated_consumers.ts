/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTS_FEATURE_ID } from './types';

const ruleTypeIdWithValidLegacyConsumers: Record<string, string[]> = {
  'example.always-firing': [ALERTS_FEATURE_ID],
  transform_health: [ALERTS_FEATURE_ID],
  '.index-threshold': [ALERTS_FEATURE_ID],
  '.geo-containment': [ALERTS_FEATURE_ID],
  '.es-query': [ALERTS_FEATURE_ID, 'discover'],
  'xpack.ml.anomaly_detection_alert': [ALERTS_FEATURE_ID],
  'xpack.ml.anomaly_detection_jobs_health': [ALERTS_FEATURE_ID],
  'xpack.synthetics.alerts.monitorStatus': [ALERTS_FEATURE_ID],
  'xpack.synthetics.alerts.tls': [ALERTS_FEATURE_ID],
  'xpack.uptime.alerts.monitorStatus': [ALERTS_FEATURE_ID],
  'xpack.uptime.alerts.tlsCertificate': [ALERTS_FEATURE_ID],
  'xpack.uptime.alerts.durationAnomaly': [ALERTS_FEATURE_ID],
  'xpack.uptime.alerts.tls': [ALERTS_FEATURE_ID],
  'siem.eqlRule': [ALERTS_FEATURE_ID],
  'siem.savedQueryRule': [ALERTS_FEATURE_ID],
  'siem.indicatorRule': [ALERTS_FEATURE_ID],
  'siem.mlRule': [ALERTS_FEATURE_ID],
  'siem.queryRule': [ALERTS_FEATURE_ID],
  'siem.thresholdRule': [ALERTS_FEATURE_ID],
  'siem.newTermsRule': [ALERTS_FEATURE_ID],
  'siem.notifications': [ALERTS_FEATURE_ID],
  'slo.rules.burnRate': [ALERTS_FEATURE_ID],
  'metrics.alert.anomaly': [ALERTS_FEATURE_ID],
  'logs.alert.document.count': [ALERTS_FEATURE_ID],
  'metrics.alert.inventory.threshold': [ALERTS_FEATURE_ID],
  'metrics.alert.threshold': [ALERTS_FEATURE_ID],
  monitoring_alert_cluster_health: [ALERTS_FEATURE_ID],
  monitoring_alert_license_expiration: [ALERTS_FEATURE_ID],
  monitoring_alert_cpu_usage: [ALERTS_FEATURE_ID],
  monitoring_alert_missing_monitoring_data: [ALERTS_FEATURE_ID],
  monitoring_alert_disk_usage: [ALERTS_FEATURE_ID],
  monitoring_alert_thread_pool_search_rejections: [ALERTS_FEATURE_ID],
  monitoring_alert_thread_pool_write_rejections: [ALERTS_FEATURE_ID],
  monitoring_alert_jvm_memory_usage: [ALERTS_FEATURE_ID],
  monitoring_alert_nodes_changed: [ALERTS_FEATURE_ID],
  monitoring_alert_logstash_version_mismatch: [ALERTS_FEATURE_ID],
  monitoring_alert_kibana_version_mismatch: [ALERTS_FEATURE_ID],
  monitoring_alert_elasticsearch_version_mismatch: [ALERTS_FEATURE_ID],
  monitoring_ccr_read_exceptions: [ALERTS_FEATURE_ID],
  monitoring_shard_size: [ALERTS_FEATURE_ID],
  'apm.transaction_duration': [ALERTS_FEATURE_ID],
  'apm.anomaly': [ALERTS_FEATURE_ID],
  'apm.error_rate': [ALERTS_FEATURE_ID],
  'apm.transaction_error_rate': [ALERTS_FEATURE_ID],
  'test.always-firing': [ALERTS_FEATURE_ID],
  'test.always-firing-alert-as-data': [ALERTS_FEATURE_ID],
  'test.authorization': [ALERTS_FEATURE_ID],
  'test.cancellableRule': [ALERTS_FEATURE_ID],
  'test.cumulative-firing': [ALERTS_FEATURE_ID],
  'test.exceedsAlertLimit': [ALERTS_FEATURE_ID],
  'test.failing': [ALERTS_FEATURE_ID],
  'test.gold.noop': [ALERTS_FEATURE_ID],
  'test.longRunning': [ALERTS_FEATURE_ID],
  'test.multipleSearches': [ALERTS_FEATURE_ID],
  'test.never-firing': [ALERTS_FEATURE_ID],
  'test.noop': [ALERTS_FEATURE_ID],
  'test.onlyContextVariables': [ALERTS_FEATURE_ID],
  'test.onlyStateVariables': [ALERTS_FEATURE_ID],
  'test.patternFiring': [ALERTS_FEATURE_ID],
  'test.patternFiringAad': [ALERTS_FEATURE_ID],
  'test.patternFiringAutoRecoverFalse': [ALERTS_FEATURE_ID],
  'test.patternLongRunning': [ALERTS_FEATURE_ID],
  'test.patternLongRunning.cancelAlertsOnRuleTimeout': [ALERTS_FEATURE_ID],
  'test.patternSuccessOrFailure': [ALERTS_FEATURE_ID],
  'test.restricted-noop': [ALERTS_FEATURE_ID],
  'test.throw': [ALERTS_FEATURE_ID],
  'test.unrestricted-noop': [ALERTS_FEATURE_ID],
  'test.validation': [ALERTS_FEATURE_ID],
};

const getRuleTypeIdValidLegacyConsumers = (ruleTypeId: string): string[] => {
  if (ruleTypeIdWithValidLegacyConsumers[ruleTypeId]) {
    return ruleTypeIdWithValidLegacyConsumers[ruleTypeId];
  }
  return [];
};

export { getRuleTypeIdValidLegacyConsumers };
