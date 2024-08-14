/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';
import { calculateRuleSourceForImport } from './calculate_rule_source_for_import';

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
    source_updated_at: '2024-05-01',
    ...overrides,
  } as PrebuiltRuleAsset;
};

describe('calculateRuleSourceForImport', () => {
  it('calculates as internal if no asset is found', () => {
    const result = calculateRuleSourceForImport({
      rule: buildTestRule(),
      prebuiltRuleAssets: [],
      installedRuleIds: [],
    });

    expect(result).toEqual({
      type: 'internal',
    });
  });

  it('calculates as unmodified external type if an asset is found without a matching version', () => {
    const result = calculateRuleSourceForImport({
      rule: buildTestRule(),
      prebuiltRuleAssets: [],
      installedRuleIds: ['rule_id'],
    });

    expect(result).toEqual({
      type: 'external',
      isCustomized: false,
    });
  });

  it('calculates as external with customizations if a matching asset/version is found', () => {
    const rule = buildTestRule();
    const prebuiltRuleAssets = [buildTestRuleAsset()];

    const result = calculateRuleSourceForImport({
      rule,
      prebuiltRuleAssets,
      installedRuleIds: ['rule_id'],
    });

    expect(result).toEqual({
      type: 'external',
      source_updated_at: '2024-05-01',
      isCustomized: true,
    });
  });
});
