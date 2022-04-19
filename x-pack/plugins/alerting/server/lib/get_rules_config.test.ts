/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExecutionConfigForRuleType } from './get_rules_config';
import { RulesConfig } from '../config';

const ruleTypeId = 'test-rule-type-id';
const config = {
  minimumScheduleInterval: {
    value: '2m',
    enforce: false,
  },
  run: {
    timeout: '1m',
    actions: { max: 1000 },
  },
} as RulesConfig;

const configWithRuleType = {
  ...config,
  run: {
    ...config.run,
    ruleTypeOverrides: [
      {
        id: ruleTypeId,
        actions: { max: 20 },
      },
    ],
  },
};

describe('get rules config', () => {
  test('returns the rule type specific config and keeps the default values that are not overwritten', () => {
    expect(getExecutionConfigForRuleType({ config: configWithRuleType, ruleTypeId })).toEqual({
      run: {
        id: ruleTypeId,
        timeout: '1m',
        actions: { max: 20 },
      },
    });
  });

  test('returns the default config when there is no rule type specific config', () => {
    expect(getExecutionConfigForRuleType({ config, ruleTypeId })).toEqual({
      run: config.run,
    });
  });
});
