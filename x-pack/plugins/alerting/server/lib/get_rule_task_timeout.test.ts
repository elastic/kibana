/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleTaskTimeout } from './get_rule_task_timeout';
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
        timeout: '10m',
      },
    ],
  },
};

const configWithoutTimeout = {
  ...config,
  run: {
    actions: { max: 1000 },
  },
};

describe('get rule task timeout', () => {
  test('returns the rule type specific timeout', () => {
    expect(getRuleTaskTimeout({ config: configWithRuleType, ruleTypeId })).toBe('10m');
  });

  test('returns the timeout that applies all the rule types', () => {
    expect(getRuleTaskTimeout({ config, ruleTypeId })).toBe('1m');
  });

  test('returns the timeout passed by the plugin', () => {
    expect(
      getRuleTaskTimeout({ config: configWithoutTimeout, ruleTaskTimeout: '20m', ruleTypeId })
    ).toBe('20m');
  });

  test('returns the default timeout', () => {
    expect(getRuleTaskTimeout({ config: configWithoutTimeout, ruleTypeId })).toBe('5m');
  });
});
