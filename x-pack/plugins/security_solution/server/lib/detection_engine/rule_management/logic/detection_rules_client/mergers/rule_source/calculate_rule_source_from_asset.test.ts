/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../../../../prebuilt_rules';
import { calculateRuleSourceFromAsset } from './calculate_rule_source_from_asset';

const buildTestRule = (overrides?: Partial<RuleResponse>) => {
  return {
    rule_id: 'rule_id',
    version: 1,
    ...overrides,
  } as RuleResponse;
};

const buildTestRuleAsset = (overrides?: Partial<PrebuiltRuleAsset>) => {
  return {
    rule_id: 'rule_id',
    version: 1,
    ...overrides,
  } as PrebuiltRuleAsset;
};

describe('calculateRuleSourceFromAsset', () => {
  it('calculates as internal if no asset is found', () => {
    const result = calculateRuleSourceFromAsset({
      rule: buildTestRule(),
      prebuiltRuleAsset: undefined,
      ruleIdExists: false,
    });

    expect(result).toEqual({
      type: 'internal',
    });
  });

  it('calculates as unmodified external type if an asset is found without a matching version', () => {
    const result = calculateRuleSourceFromAsset({
      rule: buildTestRule(),
      prebuiltRuleAsset: buildTestRuleAsset({ version: 2 }),
      ruleIdExists: true,
    });

    expect(result).toEqual({
      type: 'external',
      is_customized: false,
    });
  });

  it('calculates as unmodified external type if an asset is not found but the rule ID exists', () => {
    const result = calculateRuleSourceFromAsset({
      rule: buildTestRule(),
      prebuiltRuleAsset: undefined,
      ruleIdExists: true,
    });

    expect(result).toEqual({
      type: 'external',
      is_customized: false,
    });
  });

  it('calculates as external with customizations if a matching asset/version is found', () => {
    const rule = buildTestRule();

    const result = calculateRuleSourceFromAsset({
      rule,
      prebuiltRuleAsset: buildTestRuleAsset(),
      ruleIdExists: true,
    });

    expect(result).toEqual({
      type: 'external',
      is_customized: true,
    });
  });
});
