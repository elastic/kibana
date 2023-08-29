/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTS_FEATURE_ID } from './types';

const ruleTypeIdWithLegacyConsumers: Record<string, string[]> = {
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
};

const isRuleTypeIdHasLegacyConsumers = (ruleTypeId: string): boolean => {
  if (ruleTypeIdWithLegacyConsumers[ruleTypeId]) {
    return true;
  } else if (ruleTypeId.startsWith('test.')) {
    return true;
  }
  return false;
};

const getRuleTypeIdLegacyConsumers = (ruleTypeId: string): string[] => {
  if (ruleTypeIdWithLegacyConsumers[ruleTypeId]) {
    return ruleTypeIdWithLegacyConsumers[ruleTypeId];
  } else if (ruleTypeId.startsWith('test.')) {
    return [ALERTS_FEATURE_ID];
  }
  return [];
};

export { isRuleTypeIdHasLegacyConsumers, getRuleTypeIdLegacyConsumers };
