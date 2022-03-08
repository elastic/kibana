/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFormattedExecutionConfig } from './get_formatted_execution_config';
import { RuleExecutionConfig } from '../config';

const ruleTypeId = 'test-rule-type-id';
const executionConfig: RuleExecutionConfig = {
  aDefaultConfig: 1,
  actions: { max: 1000 },
} as RuleExecutionConfig;

const configWithRuleType = {
  ...executionConfig,
  ruleTypeOverrides: [
    {
      id: ruleTypeId,
      actions: { max: 20 },
    },
  ],
};

describe('getFormattedExecutionConfig', () => {
  test('returns the rule type specific config and keeps the default values that are not overwritten', () => {
    expect(
      getFormattedExecutionConfig({ executionConfig: configWithRuleType, ruleTypeId })
    ).toEqual({
      id: ruleTypeId,
      aDefaultConfig: 1,
      actions: { max: 20 },
    });
  });

  test('returns the default config when there is no rule type specific config', () => {
    expect(getFormattedExecutionConfig({ executionConfig, ruleTypeId })).toEqual(executionConfig);
  });
});
