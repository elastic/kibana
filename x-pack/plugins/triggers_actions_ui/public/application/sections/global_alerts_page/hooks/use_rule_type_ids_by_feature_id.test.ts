/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks/dom';
import { useRuleTypeIdsByFeatureId } from './use_rule_type_ids_by_feature_id';
import { ruleTypesIndex } from '../../../mock/rule_types_index';
import { MULTI_CONSUMER_RULE_TYPE_IDS } from '../../../constants';
import { AlertConsumers } from '@kbn/rule-data-utils';

describe('useRuleTypeIdsByFeatureId', () => {
  it('should correctly reverse the rule types index', () => {
    const { result } = renderHook(() => useRuleTypeIdsByFeatureId(ruleTypesIndex));
    expect(Object.keys(result.current)).toEqual(['stackAlerts', 'observability', 'ml', 'siem']);
    Object.values(result.current).forEach((ruleTypes) => {
      expect(ruleTypes).not.toHaveLength(0);
    });
  });

  it("should group o11y apps rule types inside a common 'observability' key", () => {
    const { result } = renderHook(() => useRuleTypeIdsByFeatureId(ruleTypesIndex));
    expect(result.current.observability).toEqual(
      expect.arrayContaining([
        'slo.rules.burnRate',
        'xpack.uptime.alerts.tls',
        'xpack.uptime.alerts.tlsCertificate',
        'xpack.uptime.alerts.monitorStatus',
        'xpack.uptime.alerts.durationAnomaly',
        'xpack.synthetics.alerts.monitorStatus',
        'xpack.synthetics.alerts.tls',
        'metrics.alert.threshold',
        'metrics.alert.inventory.threshold',
        'observability.rules.custom_threshold',
        'logs.alert.document.count',
        'monitoring_alert_license_expiration',
        'monitoring_alert_cluster_health',
        'monitoring_alert_cpu_usage',
        'monitoring_alert_disk_usage',
        'monitoring_alert_nodes_changed',
        'monitoring_alert_elasticsearch_version_mismatch',
        'monitoring_alert_kibana_version_mismatch',
        'monitoring_alert_logstash_version_mismatch',
        'monitoring_alert_jvm_memory_usage',
        'monitoring_alert_missing_monitoring_data',
        'monitoring_alert_thread_pool_search_rejections',
        'monitoring_alert_thread_pool_write_rejections',
        'monitoring_ccr_read_exceptions',
        'monitoring_shard_size',
        'apm.error_rate',
        'apm.transaction_error_rate',
        'apm.transaction_duration',
        'apm.anomaly',
      ])
    );
  });

  it('should list multi-consumer rule types both in o11y and Stack management', () => {
    const { result } = renderHook(() => useRuleTypeIdsByFeatureId(ruleTypesIndex));
    [AlertConsumers.OBSERVABILITY, AlertConsumers.STACK_ALERTS].forEach((featureId) => {
      expect(result.current[featureId]).toEqual(
        expect.arrayContaining(MULTI_CONSUMER_RULE_TYPE_IDS)
      );
    });
  });
});
