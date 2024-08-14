/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateRuleSource } from './calculate_rule_source';

describe('calculateRuleSource', () => {
  it('should return internal type for custom rules', () => {
    const rule = { rule_id: 'custom-rule', version: 1 };
    const prebuiltRuleAssets = [];

    const result = calculateRuleSource({ rule, prebuiltRuleAssets });

    expect(result).toEqual({ type: 'internal' });
  });

  it('should return external type for prebuilt rules with matching version', () => {
    const rule = { rule_id: 'prebuilt-rule', version: 1 };
    const prebuiltRuleAssets = [
      { rule_id: 'prebuilt-rule', version: 1, source_updated_at: '2024-05-01' },
    ];

    const result = calculateRuleSource({ rule, prebuiltRuleAssets });

    expect(result).toEqual({
      type: 'external',
      source_updated_at: '2024-05-01',
      isCustomized: false,
    });
  });

  it('should return external type for prebuilt rules without matching version', () => {
    const rule = { rule_id: 'prebuilt-rule', version: 999 };
    const prebuiltRuleAssets = [
      { rule_id: 'prebuilt-rule', version: 1, source_updated_at: '2024-05-01' },
    ];

    const result = calculateRuleSource({ rule, prebuiltRuleAssets });

    expect(result).toEqual({
      type: 'external',
      isCustomized: false,
    });
  });

  it('should return external type with isCustomized true for prebuilt rules with customizations', () => {
    const rule = { rule_id: 'prebuilt-rule', version: 1, name: 'Custom Prebuilt Rule' };
    const prebuiltRuleAssets = [
      {
        rule_id: 'prebuilt-rule',
        version: 1,
        name: 'Prebuilt Rule',
        source_updated_at: '2024-05-01',
      },
    ];

    const result = calculateRuleSource({ rule, prebuiltRuleAssets });

    expect(result).toEqual({
      type: 'external',
      source_updated_at: '2024-05-01',
      isCustomized: true,
    });
  });

  it('should throw an error for prebuilt rules without version', () => {
    const rule = { rule_id: 'prebuilt-rule' };
    const prebuiltRuleAssets = [
      { rule_id: 'prebuilt-rule', version: 1, source_updated_at: '2024-05-01' },
    ];

    expect(() => calculateRuleSource({ rule, prebuiltRuleAssets })).toThrow(
      'version is required for prebuilt rules'
    );
  });
});
