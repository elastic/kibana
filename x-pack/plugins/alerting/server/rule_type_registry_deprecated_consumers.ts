/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULES_FEATURE_ID } from './types';

export const ruleTypeIdWithValidLegacyConsumers: Record<string, string[]> = {
  'example.always-firing': [RULES_FEATURE_ID],
  'example.people-in-space': [RULES_FEATURE_ID],
  transform_health: [RULES_FEATURE_ID],
  '.index-threshold': [RULES_FEATURE_ID],
  '.geo-containment': [RULES_FEATURE_ID],
  '.es-query': [RULES_FEATURE_ID, 'discover'],
  'xpack.ml.anomaly_detection_alert': [RULES_FEATURE_ID],
  'xpack.ml.anomaly_detection_jobs_health': [RULES_FEATURE_ID],
  'xpack.synthetics.alerts.monitorStatus': [RULES_FEATURE_ID],
  'xpack.synthetics.alerts.tls': [RULES_FEATURE_ID],
  'xpack.uptime.alerts.monitorStatus': [RULES_FEATURE_ID],
  'xpack.uptime.alerts.tlsCertificate': [RULES_FEATURE_ID],
  'xpack.uptime.alerts.durationAnomaly': [RULES_FEATURE_ID],
  'xpack.uptime.alerts.tls': [RULES_FEATURE_ID],
  'siem.eqlRule': [RULES_FEATURE_ID],
  'siem.savedQueryRule': [RULES_FEATURE_ID],
  'siem.indicatorRule': [RULES_FEATURE_ID],
  'siem.mlRule': [RULES_FEATURE_ID],
  'siem.queryRule': [RULES_FEATURE_ID],
  'siem.thresholdRule': [RULES_FEATURE_ID],
  'siem.newTermsRule': [RULES_FEATURE_ID],
  'siem.notifications': [RULES_FEATURE_ID],
  'slo.rules.burnRate': [RULES_FEATURE_ID],
  'logs.alert.document.count': [RULES_FEATURE_ID],
  'metrics.alert.inventory.threshold': [RULES_FEATURE_ID],
  'metrics.alert.threshold': [RULES_FEATURE_ID],
  monitoring_alert_cluster_health: [RULES_FEATURE_ID],
  monitoring_alert_license_expiration: [RULES_FEATURE_ID],
  monitoring_alert_cpu_usage: [RULES_FEATURE_ID],
  monitoring_alert_missing_monitoring_data: [RULES_FEATURE_ID],
  monitoring_alert_disk_usage: [RULES_FEATURE_ID],
  monitoring_alert_thread_pool_search_rejections: [RULES_FEATURE_ID],
  monitoring_alert_thread_pool_write_rejections: [RULES_FEATURE_ID],
  monitoring_alert_jvm_memory_usage: [RULES_FEATURE_ID],
  monitoring_alert_nodes_changed: [RULES_FEATURE_ID],
  monitoring_alert_logstash_version_mismatch: [RULES_FEATURE_ID],
  monitoring_alert_kibana_version_mismatch: [RULES_FEATURE_ID],
  monitoring_alert_elasticsearch_version_mismatch: [RULES_FEATURE_ID],
  monitoring_ccr_read_exceptions: [RULES_FEATURE_ID],
  monitoring_shard_size: [RULES_FEATURE_ID],
  'apm.transaction_duration': [RULES_FEATURE_ID],
  'apm.anomaly': [RULES_FEATURE_ID],
  'apm.error_rate': [RULES_FEATURE_ID],
  'apm.transaction_error_rate': [RULES_FEATURE_ID],
  'test.always-firing': [RULES_FEATURE_ID],
  'test.always-firing-alert-as-data': [RULES_FEATURE_ID],
  'test.authorization': [RULES_FEATURE_ID],
  'test.cancellableRule': [RULES_FEATURE_ID],
  'test.cumulative-firing': [RULES_FEATURE_ID],
  'test.exceedsAlertLimit': [RULES_FEATURE_ID],
  'test.failing': [RULES_FEATURE_ID],
  'test.gold.noop': [RULES_FEATURE_ID],
  'test.longRunning': [RULES_FEATURE_ID],
  'test.multipleSearches': [RULES_FEATURE_ID],
  'test.never-firing': [RULES_FEATURE_ID],
  'test.noop': [RULES_FEATURE_ID],
  'test.onlyContextVariables': [RULES_FEATURE_ID],
  'test.onlyStateVariables': [RULES_FEATURE_ID],
  'test.patternFiring': [RULES_FEATURE_ID],
  'test.patternFiringAad': [RULES_FEATURE_ID],
  'test.patternFiringAutoRecoverFalse': [RULES_FEATURE_ID],
  'test.patternLongRunning': [RULES_FEATURE_ID],
  'test.patternLongRunning.cancelAlertsOnRuleTimeout': [RULES_FEATURE_ID],
  'test.patternSuccessOrFailure': [RULES_FEATURE_ID],
  'test.restricted-noop': [RULES_FEATURE_ID],
  'test.throw': [RULES_FEATURE_ID],
  'test.unrestricted-noop': [RULES_FEATURE_ID],
  'test.validation': [RULES_FEATURE_ID],
};

const getRuleTypeIdValidLegacyConsumers = (ruleTypeId: string): string[] => {
  if (ruleTypeIdWithValidLegacyConsumers[ruleTypeId]) {
    return ruleTypeIdWithValidLegacyConsumers[ruleTypeId];
  }
  return [];
};

export { getRuleTypeIdValidLegacyConsumers };
