/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringCollectionStart } from '@kbn/monitoring-collection-plugin/server';

const PREFIX = `kibana_alerting_node_`;

export class NodeLevelMetrics {
  private monitoringCollection: MonitoringCollectionStart;

  constructor(monitoringCollection: MonitoringCollectionStart) {
    this.monitoringCollection = monitoringCollection;
  }

  public execution(actionId: string, actionType?: string, executionTime?: number) {
    const dimensions: Record<string, string> = { action_id: actionId };
    if (actionType) {
      dimensions.action_type = actionType;
    }

    this.monitoringCollection.reportCounter(`${PREFIX}action_executions`, dimensions);
    if (typeof executionTime === 'number') {
      this.monitoringCollection.reportGauge(
        `${PREFIX}action_execution_time`,
        dimensions,
        executionTime
      );
    }
  }

  public failure(actionId: string, actionType?: string) {
    const dimensions: Record<string, string> = { action_id: actionId };
    if (actionType) dimensions.action_type = actionType;
    this.monitoringCollection.reportCounter(`${PREFIX}action_failures`, dimensions);
  }

  public timeout(actionId: string, actionType?: string, timeout?: string) {
    const dimensions: Record<string, string> = { action_id: actionId };
    if (timeout) dimensions.timeout = timeout;
    if (actionType) dimensions.action_type = actionType;
    this.monitoringCollection.reportCounter(`${PREFIX}action_timeouts`, dimensions);
  }
}
