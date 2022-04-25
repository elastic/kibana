/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringCollectionStart } from '@kbn/monitoring-collection-plugin/server';
import { NodeLevelMetricsEnum } from '../../common/monitoring/types';

export class NodeLevelMetrics {
  private monitoringCollection: MonitoringCollectionStart;

  constructor(monitoringCollection: MonitoringCollectionStart) {
    this.monitoringCollection = monitoringCollection;
  }

  public execution(actionId: string, actionTypeId: string, executionTime?: number) {
    this.monitoringCollection.reportCounter(
      NodeLevelMetricsEnum.kibana_alerting_node_action_executions,
      { action_id: actionId, action_type_id: actionTypeId }
    );
    if (typeof executionTime === 'number') {
      this.monitoringCollection.reportGauge(
        NodeLevelMetricsEnum.kibana_alerting_node_action_execution_time,
        { action_id: actionId, action_type_id: actionTypeId },
        executionTime
      );
    }
  }

  public failure(actionId: string, actionTypeId: string) {
    this.monitoringCollection.reportCounter(
      NodeLevelMetricsEnum.kibana_alerting_node_action_failures,
      {
        action_id: actionId,
        action_type_id: actionTypeId,
      }
    );
  }

  public timeout(actionId: string, actionTypeId: string, timeout?: string) {
    const dimensions: Record<string, string> = {
      action_id: actionId,
      action_type_id: actionTypeId,
    };
    if (timeout) {
      dimensions.timeout = timeout;
    }
    this.monitoringCollection.reportCounter(
      NodeLevelMetricsEnum.kibana_alerting_node_action_timeouts,
      dimensions
    );
  }
}
