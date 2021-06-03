/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initialDetectionRulesUsage, updateDetectionRuleUsage } from './detection_rule_helpers';
import { DetectionRuleMetric, DetectionRulesTypeUsage } from './types';
import { v4 as uuid } from 'uuid';

const createStubRule = (
  ruleType: string,
  enabled: boolean,
  elasticRule: boolean,
  alertCount: number,
  caseCount: number
): DetectionRuleMetric => ({
  rule_name: uuid(),
  rule_id: uuid(),
  rule_type: ruleType,
  enabled,
  elastic_rule: elasticRule,
  created_on: uuid(),
  updated_on: uuid(),
  alert_count_daily: alertCount,
  cases_count_total: caseCount,
});

describe('Detections Usage and Metrics', () => {
  describe('Update metrics with rule information', () => {
    it('Should update elastic and eql rule metric total', async () => {
      const initialUsage: DetectionRulesTypeUsage = initialDetectionRulesUsage;
      const stubRule = createStubRule('eql', true, true, 1, 1);
      const usage = updateDetectionRuleUsage(stubRule, initialUsage);

      expect(usage).toEqual(
        expect.objectContaining({
          custom_total: {
            alerts: 0,
            cases: 0,
            disabled: 0,
            enabled: 0,
          },
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
          machine_learning: {
            alerts: 0,
            cases: 0,
            disabled: 0,
            enabled: 0,
          },
          query: {
            alerts: 0,
            cases: 0,
            disabled: 0,
            enabled: 0,
          },
          threat_match: {
            alerts: 0,
            cases: 0,
            disabled: 0,
            enabled: 0,
          },
          threshold: {
            alerts: 0,
            cases: 0,
            disabled: 0,
            enabled: 0,
          },
        })
      );
    });

    it('Should update based on multiple metrics', async () => {
      const initialUsage: DetectionRulesTypeUsage = initialDetectionRulesUsage;
      const stubEqlRule = createStubRule('eql', true, true, 1, 1);
      const stubQueryRuleOne = createStubRule('query', true, true, 5, 2);
      const stubQueryRuleTwo = createStubRule('query', true, false, 5, 2);
      const stubMachineLearningOne = createStubRule('machine_learning', false, false, 0, 10);
      const stubMachineLearningTwo = createStubRule('machine_learning', true, true, 22, 44);

      let usage = updateDetectionRuleUsage(stubEqlRule, initialUsage);
      usage = updateDetectionRuleUsage(stubQueryRuleOne, usage);
      usage = updateDetectionRuleUsage(stubQueryRuleTwo, usage);
      usage = updateDetectionRuleUsage(stubMachineLearningOne, usage);
      usage = updateDetectionRuleUsage(stubMachineLearningTwo, usage);

      expect(usage).toEqual(
        expect.objectContaining({
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
          threat_match: {
            alerts: 0,
            cases: 0,
            disabled: 0,
            enabled: 0,
          },
          threshold: {
            alerts: 0,
            cases: 0,
            disabled: 0,
            enabled: 0,
          },
        })
      );
    });
  });
});
