/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isValidRule, buildRuleDescription, getAppliesToValueFromAnomaly } from './utils';
import {
  ACTION,
  APPLIES_TO,
  OPERATOR,
  FILTER_TYPE,
} from '../../../../common/constants/detector_rule';

describe('ML - rule editor utils', () => {
  const ruleWithCondition = {
    actions: [ACTION.SKIP_RESULT],
    conditions: [
      {
        applies_to: APPLIES_TO.ACTUAL,
        operator: OPERATOR.GREATER_THAN,
        value: 10,
      },
    ],
  };

  const ruleWithScope = {
    actions: [ACTION.SKIP_RESULT],
    scope: {
      instance: {
        filter_id: 'test_aws_instances',
        filter_type: FILTER_TYPE.INCLUDE,
        enabled: true,
      },
    },
  };

  const ruleWithConditionAndScope = {
    actions: [ACTION.SKIP_RESULT],
    conditions: [
      {
        applies_to: APPLIES_TO.TYPICAL,
        operator: OPERATOR.LESS_THAN,
        value: 100,
      },
    ],
    scope: {
      instance: {
        filter_id: 'test_aws_instances',
        filter_type: FILTER_TYPE.EXCLUDE,
        enabled: true,
      },
    },
  };

  describe('isValidRule', () => {
    test('returns true for a rule with an action and a condition', () => {
      expect(isValidRule(ruleWithCondition)).toBe(true);
    });

    test('returns true for a rule with an action and scope', () => {
      expect(isValidRule(ruleWithScope)).toBe(true);
    });

    test('returns true for a rule with an action, scope and condition', () => {
      expect(isValidRule(ruleWithConditionAndScope)).toBe(true);
    });

    test('returns false for a rule with no action', () => {
      const ruleWithNoAction = {
        actions: [],
        conditions: [
          {
            applies_to: APPLIES_TO.TYPICAL,
            operator: OPERATOR.LESS_THAN,
            value: 100,
          },
        ],
      };

      expect(isValidRule(ruleWithNoAction)).toBe(false);
    });

    test('returns false for a rule with no scope or conditions', () => {
      const ruleWithNoScopeOrCondition = {
        actions: [ACTION.SKIP_RESULT],
      };

      expect(isValidRule(ruleWithNoScopeOrCondition)).toBe(false);
    });
  });

  describe('buildRuleDescription', () => {
    test('returns expected rule descriptions', () => {
      expect(buildRuleDescription(ruleWithCondition)).toBe(
        'skip result when actual is greater than 10'
      );
      expect(buildRuleDescription(ruleWithScope)).toBe(
        'skip result when instance is in test_aws_instances'
      );
      expect(buildRuleDescription(ruleWithConditionAndScope)).toBe(
        'skip result when typical is less than 100 AND instance is not in test_aws_instances'
      );
    });
  });

  describe('getAppliesToValueFromAnomaly', () => {
    const anomaly = {
      actual: [210],
      typical: [1.23],
    };

    test('returns expected actual value from an anomaly', () => {
      expect(getAppliesToValueFromAnomaly(anomaly, APPLIES_TO.ACTUAL)).toBe(210);
    });

    test('returns expected typical value from an anomaly', () => {
      expect(getAppliesToValueFromAnomaly(anomaly, APPLIES_TO.TYPICAL)).toBe(1.23);
    });

    test('returns expected diff from typical value from an anomaly', () => {
      expect(getAppliesToValueFromAnomaly(anomaly, APPLIES_TO.DIFF_FROM_TYPICAL)).toBe(208.77);
    });
  });
});
