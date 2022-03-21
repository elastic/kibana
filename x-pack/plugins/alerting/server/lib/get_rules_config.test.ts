/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRulesConfig } from './get_rules_config';
import { RulesConfig } from '../config';

const ruleTypeId = 'test-rule-type-id';
const config = {
  execution: {
    timeout: '1m',
    actions: { max: 1000 },
  },
} as RulesConfig;

const configWithRuleType = {
  execution: {
    ...config.execution,
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
    expect(getRulesConfig({ config: configWithRuleType, ruleTypeId })).toEqual({
      execution: {
        id: ruleTypeId,
        timeout: '1m',
        actions: { max: 20 },
      },
    });
  });

  test('returns the default config when there is no rule type specific config', () => {
    expect(getRulesConfig({ config, ruleTypeId })).toEqual(config);
  });
});
