/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleTypeConfig } from './get_rule_type_config';

const ruleTypeId = 'test-rule-type-id';
const config = {
  cancelAlertsOnRuleTimeout: true,
  defaultRuleTaskTimeout: '5m',
  healthCheck: {
    interval: '60m',
  },
  invalidateApiKeysTask: {
    interval: '5m',
    removalDelay: '1h',
  },
  maxEphemeralActionsPerAlert: 10,
  minimumScheduleInterval: '1m',
  rules: {
    default: {
      aDefaultConfig: 1,
      maxExecutableActions: 1000,
    },
  },
};

const configWithRuleType = {
  ...config,
  rules: {
    ...config.rules,
    ruleTypes: [
      {
        id: ruleTypeId,
        maxExecutableActions: 20,
      },
    ],
  },
};

describe('getRuleTypeConfig', () => {
  test('returns the rule type specific config and keeps the default values that are not overwritten', () => {
    expect(getRuleTypeConfig({ config: configWithRuleType, ruleTypeId })).toEqual({
      id: ruleTypeId,
      aDefaultConfig: 1,
      maxExecutableActions: 20,
    });
  });

  test('returns the default config when there is no rule type specific config', () => {
    expect(getRuleTypeConfig({ config, ruleTypeId })).toEqual(config.rules.default);
  });
});
