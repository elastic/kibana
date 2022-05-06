/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monitoringCollectionMock } from '@kbn/monitoring-collection-plugin/server/mocks';
import { RuleExecutionStatusErrorReasons } from '../types';
import { NodeLevelMetrics } from './node_level_metrics';

describe('NodeLevelMetrics', () => {
  const monitoringCollection = monitoringCollectionMock.createStart();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execution', () => {
    it('should register a counter when called', () => {
      const metrics = new NodeLevelMetrics(monitoringCollection);
      metrics.execution('ruleA');
      expect(monitoringCollection.reportCounter).toHaveBeenCalledTimes(1);
      expect(monitoringCollection.reportCounter).toHaveBeenCalledWith(
        'kibana_alerting_node_rule_executions',
        { rule_id: 'ruleA' }
      );
    });

    it('should report a gauge when provided with an execution time', () => {
      const executionTime = 1000;
      const metrics = new NodeLevelMetrics(monitoringCollection);
      metrics.execution('ruleA', executionTime);
      expect(monitoringCollection.reportCounter).toHaveBeenCalledTimes(1);
      expect(monitoringCollection.reportCounter).toHaveBeenCalledWith(
        'kibana_alerting_node_rule_executions',
        { rule_id: 'ruleA' }
      );
      expect(monitoringCollection.reportGauge).toHaveBeenCalledTimes(1);
      expect(monitoringCollection.reportGauge).toHaveBeenCalledWith(
        'kibana_alerting_node_rule_execution_time',
        { rule_id: 'ruleA' },
        executionTime
      );
    });
  });

  describe('failure', () => {
    it('should register a counter when called', () => {
      const metrics = new NodeLevelMetrics(monitoringCollection);
      metrics.failure('ruleA', RuleExecutionStatusErrorReasons.Read);
      expect(monitoringCollection.reportCounter).toHaveBeenCalledTimes(1);
      expect(monitoringCollection.reportCounter).toHaveBeenCalledWith(
        `kibana_alerting_node_rule_failures`,
        { rule_id: 'ruleA', failure_reason: RuleExecutionStatusErrorReasons.Read }
      );
    });
  });

  describe('timeout', () => {
    it('should register a counter when called', () => {
      const metrics = new NodeLevelMetrics(monitoringCollection);
      metrics.timeout('ruleA');
      expect(monitoringCollection.reportCounter).toHaveBeenCalledTimes(1);
      expect(monitoringCollection.reportCounter).toHaveBeenCalledWith(
        `kibana_alerting_node_rule_timeouts`,
        { rule_id: 'ruleA' }
      );
    });

    it('should report the timeout if provided', () => {
      const timeout = '1000';
      const metrics = new NodeLevelMetrics(monitoringCollection);
      metrics.timeout('ruleA', timeout);
      expect(monitoringCollection.reportCounter).toHaveBeenCalledTimes(1);
      expect(monitoringCollection.reportCounter).toHaveBeenCalledWith(
        `kibana_alerting_node_rule_timeouts`,
        { rule_id: 'ruleA', timeout }
      );
    });
  });
});
