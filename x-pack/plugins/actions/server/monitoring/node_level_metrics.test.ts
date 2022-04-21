/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monitoringCollectionMock } from '@kbn/monitoring-collection-plugin/server/mocks';
import { NodeLevelMetrics } from './node_level_metrics';

describe('NodeLevelMetrics', () => {
  const monitoringCollection = monitoringCollectionMock.createStart();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execution', () => {
    it('should register a counter when called', () => {
      const metrics = new NodeLevelMetrics(monitoringCollection);
      metrics.execution('actionA');
      expect(monitoringCollection.reportCounter).toHaveBeenCalledTimes(1);
      expect(monitoringCollection.reportCounter).toHaveBeenCalledWith(
        'kibana_alerting_node_action_executions',
        { action_id: 'actionA' }
      );
    });

    it('should report a gauge when provided with an execution time', () => {
      const executionTime = 1000;
      const metrics = new NodeLevelMetrics(monitoringCollection);
      metrics.execution('actionA', executionTime);
      expect(monitoringCollection.reportCounter).toHaveBeenCalledTimes(1);
      expect(monitoringCollection.reportCounter).toHaveBeenCalledWith(
        'kibana_alerting_node_action_executions',
        { action_id: 'actionA' }
      );
      expect(monitoringCollection.reportGauge).toHaveBeenCalledTimes(1);
      expect(monitoringCollection.reportGauge).toHaveBeenCalledWith(
        'kibana_alerting_node_action_execution_time',
        { action_id: 'actionA' },
        executionTime
      );
    });
  });

  describe('failure', () => {
    it('should register a counter when called', () => {
      const metrics = new NodeLevelMetrics(monitoringCollection);
      metrics.failure('actionA');
      expect(monitoringCollection.reportCounter).toHaveBeenCalledTimes(1);
      expect(monitoringCollection.reportCounter).toHaveBeenCalledWith(
        `kibana_alerting_node_action_failures`,
        { action_id: 'actionA' }
      );
    });
  });

  describe('timeout', () => {
    it('should register a counter when called', () => {
      const metrics = new NodeLevelMetrics(monitoringCollection);
      metrics.timeout('actionA');
      expect(monitoringCollection.reportCounter).toHaveBeenCalledTimes(1);
      expect(monitoringCollection.reportCounter).toHaveBeenCalledWith(
        `kibana_alerting_node_action_timeouts`,
        { action_id: 'actionA' }
      );
    });

    it('should report the timeout if provided', () => {
      const timeout = '1000';
      const metrics = new NodeLevelMetrics(monitoringCollection);
      metrics.timeout('actionA', timeout);
      expect(monitoringCollection.reportCounter).toHaveBeenCalledTimes(1);
      expect(monitoringCollection.reportCounter).toHaveBeenCalledWith(
        `kibana_alerting_node_action_timeouts`,
        { action_id: 'actionA', timeout }
      );
    });
  });
});
