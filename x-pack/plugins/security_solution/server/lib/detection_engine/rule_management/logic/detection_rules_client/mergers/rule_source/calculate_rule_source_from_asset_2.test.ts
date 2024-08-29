/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { calculateRuleSourceFromAsset } from './calculate_rule_source_from_asset';

import { getRulesSchemaMock } from '../../../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { getPrebuiltRuleMock } from '../../../../../prebuilt_rules/model/rule_assets/prebuilt_rule_asset.mock';

describe('calculateRuleSourceFromAsset', () => {
  it('calculates as internal if no asset is found and rule ID does not exist', () => {
    const result = calculateRuleSourceFromAsset({
      rule: getRulesSchemaMock(),
      prebuiltRuleAsset: undefined,
      ruleIdExists: false,
    });

    expect(result).toEqual({ type: 'internal' });
  });

  it('calculates as external with customizations if an asset is found with a matching version', () => {
    const ruleToImport = getRulesSchemaMock();
    const result = calculateRuleSourceFromAsset({
      rule: ruleToImport,
      prebuiltRuleAsset: getPrebuiltRuleMock({ ...ruleToImport, version: 1 }),
      ruleIdExists: true,
    });

    expect(result).toEqual({
      type: 'external',
      is_customized: true,
      source_updated_at: expect.any(String),
    });
  });

  it('calculates as external with customizations if an asset is found with a different version', () => {
    const ruleToImport = getRulesSchemaMock();
    const result = calculateRuleSourceFromAsset({
      rule: ruleToImport,
      prebuiltRuleAsset: getPrebuiltRuleMock({ ...ruleToImport, version: 2 }),
      ruleIdExists: true,
    });

    expect(result).toEqual({
      type: 'external',
      is_customized: true,
      source_updated_at: expect.any(String),
    });
  });

  it('calculates as unmodified external type if an asset is not found but the rule ID exists', () => {
    const result = calculateRuleSourceFromAsset({
      rule: getRulesSchemaMock(),
      prebuiltRuleAsset: undefined,
      ruleIdExists: true,
    });

    expect(result).toEqual({
      type: 'external',
      is_customized: false,
    });
  });

  it('calculates as external with customizations if a matching asset/version is found', () => {
    const rule = getRulesSchemaMock();
    const asset = getPrebuiltRuleMock(rule);

    const result = calculateRuleSourceFromAsset({
      rule,
      prebuiltRuleAsset: asset,
      ruleIdExists: true,
    });

    expect(result).toEqual({
      type: 'external',
      source_updated_at: expect.any(String),
      is_customized: true,
    });
  });

  it('calculates as external with customizations if asset is found but versions differ', () => {
    const rule = getRulesSchemaMock();
    const asset = getPrebuiltRuleMock({ ...rule, version: rule.version + 1 });

    const result = calculateRuleSourceFromAsset({
      rule,
      prebuiltRuleAsset: asset,
      ruleIdExists: true,
    });

    expect(result).toEqual({
      type: 'external',
      source_updated_at: expect.any(String),
      is_customized: true,
    });
  });
});
