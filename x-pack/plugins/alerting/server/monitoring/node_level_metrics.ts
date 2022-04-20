/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { MonitoringCollectionStart } from '@kbn/monitoring-collection-plugin/server';
import { RuleExecutionStatusErrorReasons } from '../types';

const PREFIX = `kibana_alerting_node_`;

export class NodeLevelMetrics {
  private logger: Logger;
  private monitoringCollection: MonitoringCollectionStart;

  constructor(logger: Logger, monitoringCollection: MonitoringCollectionStart) {
    this.logger = logger;
    this.monitoringCollection = monitoringCollection;
  }

  public execution(ruleId: string, executionTime?: number) {
    this.monitoringCollection.reportCounter(`${PREFIX}rule_executions`, { rule_id: ruleId });
    if (typeof executionTime === 'number') {
      this.monitoringCollection.reportGauge(
        `${PREFIX}rule_execution_time`,
        { rule_id: ruleId },
        executionTime
      );
    }
  }

  public failure(ruleId: string, reason: RuleExecutionStatusErrorReasons) {
    this.monitoringCollection.reportCounter(`${PREFIX}rule_${reason}_failures`, {
      rule_id: ruleId,
    });
  }

  public timeout(ruleId: string, timeout?: string) {
    const dimensions: Record<string, string> = { rule_id: ruleId };
    if (timeout) {
      dimensions.timeout = timeout;
    }
    this.monitoringCollection.reportCounter(`${PREFIX}rule_timeouts`, dimensions);
  }
}
