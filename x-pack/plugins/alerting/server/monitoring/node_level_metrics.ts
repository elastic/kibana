/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringCollectionStart } from '@kbn/monitoring-collection-plugin/server';
import { RuleExecutionStatusErrorReasons } from '../types';
import { NodeLevelMetricsEnum } from '../../common/monitoring/types';

export class NodeLevelMetrics {
  private monitoringCollection: MonitoringCollectionStart;

  constructor(monitoringCollection: MonitoringCollectionStart) {
    this.monitoringCollection = monitoringCollection;
  }

  public execution(ruleId: string, executionTime?: number) {
    this.monitoringCollection.reportCounter(
      NodeLevelMetricsEnum.kibana_alerting_node_rule_executions,
      { rule_id: ruleId }
    );
    if (typeof executionTime === 'number') {
      this.monitoringCollection.reportGauge(
        NodeLevelMetricsEnum.kibana_alerting_node_rule_execution_time,
        { rule_id: ruleId },
        executionTime
      );
    }
  }

  public failure(ruleId: string, reason: RuleExecutionStatusErrorReasons) {
    this.monitoringCollection.reportCounter(
      NodeLevelMetricsEnum.kibana_alerting_node_rule_failures,
      {
        rule_id: ruleId,
        failure_reason: reason,
      }
    );
  }

  public timeout(ruleId: string, timeout?: string) {
    const dimensions: Record<string, string> = { rule_id: ruleId };
    if (timeout) {
      dimensions.timeout = timeout;
    }
    this.monitoringCollection.reportCounter(
      NodeLevelMetricsEnum.kibana_alerting_node_rule_timeouts,
      dimensions
    );
  }
}
