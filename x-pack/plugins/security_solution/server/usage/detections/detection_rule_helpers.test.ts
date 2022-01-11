/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initialDetectionRulesUsage, updateDetectionRuleUsage } from './detection_rule_helpers';
import { DetectionRuleMetric, DetectionRulesTypeUsage } from './types';

const createStubRule = (
  ruleType: string,
  enabled: boolean,
  elasticRule: boolean,
  alertCount: number,
  caseCount: number
): DetectionRuleMetric => ({
  rule_name: 'rule-name',
  rule_id: 'id-123',
  rule_type: ruleType,
  rule_version: 1,
  enabled,
  elastic_rule: elasticRule,
  created_on: '2022-01-06T20:02:45.306Z',
  updated_on: '2022-01-06T20:02:45.306Z',
  alert_count_daily: alertCount,
  cases_count_total: caseCount,
});

describe('Detections Usage and Metrics', () => {
  describe('Update metrics with rule information', () => {
    it('Should update elastic and eql rule metric total', async () => {
      const stubRule = createStubRule('eql', true, true, 1, 1);
      const usage = updateDetectionRuleUsage(stubRule, initialDetectionRulesUsage);

      expect(usage).toEqual<DetectionRulesTypeUsage>({
        ...initialDetectionRulesUsage,
        elastic_total: {
          alerts: 1,
          cases: 1,
          disabled: 0,
          enabled: 1,
        },
        eql: {
          alerts: 1,
          cases: 1,
          disabled: 0,
          enabled: 1,
        },
      });
    });

    it('Should update based on multiple metrics', async () => {
      const stubEqlRule = createStubRule('eql', true, true, 1, 1);
      const stubQueryRuleOne = createStubRule('query', true, true, 5, 2);
      const stubQueryRuleTwo = createStubRule('query', true, false, 5, 2);
      const stubMachineLearningOne = createStubRule('machine_learning', false, false, 0, 10);
      const stubMachineLearningTwo = createStubRule('machine_learning', true, true, 22, 44);

      let usage = updateDetectionRuleUsage(stubEqlRule, initialDetectionRulesUsage);
      usage = updateDetectionRuleUsage(stubQueryRuleOne, usage);
      usage = updateDetectionRuleUsage(stubQueryRuleTwo, usage);
      usage = updateDetectionRuleUsage(stubMachineLearningOne, usage);
      usage = updateDetectionRuleUsage(stubMachineLearningTwo, usage);

      expect(usage).toEqual<DetectionRulesTypeUsage>({
        ...initialDetectionRulesUsage,
        custom_total: {
          alerts: 5,
          cases: 12,
          disabled: 1,
          enabled: 1,
        },
        elastic_total: {
          alerts: 28,
          cases: 47,
          disabled: 0,
          enabled: 3,
        },
        eql: {
          alerts: 1,
          cases: 1,
          disabled: 0,
          enabled: 1,
        },
        machine_learning: {
          alerts: 22,
          cases: 54,
          disabled: 1,
          enabled: 1,
        },
        query: {
          alerts: 10,
          cases: 4,
          disabled: 0,
          enabled: 2,
        },
      });
    });
  });
});
