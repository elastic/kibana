/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ValidMetricSet } from '@kbn/monitoring-collection-plugin/common/types';

export interface RuleMonitoringMetrics {
  [key: string]: {
    data: Array<{ timestamp: number; value: number }>;
  };
}

export interface NodeLevelMetricsType {
  kibana_alerting_node_rule_executions: number;
  kibana_alerting_node_rule_execution_time: number;
  kibana_alerting_node_rule_failures: number;
  kibana_alerting_node_rule_timeouts: number;
}

export enum NodeLevelMetricsEnum {
  kibana_alerting_node_rule_executions = 'kibana_alerting_node_rule_executions',
  kibana_alerting_node_rule_execution_time = 'kibana_alerting_node_rule_execution_time',
  kibana_alerting_node_rule_failures = 'kibana_alerting_node_rule_failures',
  kibana_alerting_node_rule_timeouts = 'kibana_alerting_node_rule_timeouts',
}

export interface ClusterLevelMetricsType extends ValidMetricSet {
  kibana_alerting_cluster_rules_overdue_count: number;
  kibana_alerting_cluster_rules_overdue_delay_p50: number;
  kibana_alerting_cluster_rules_overdue_delay_p99: number;
}
