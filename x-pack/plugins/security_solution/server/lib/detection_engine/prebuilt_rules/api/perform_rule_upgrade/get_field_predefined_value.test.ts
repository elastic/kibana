/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldPredefinedValue } from './get_field_predefined_value';
import {
  NON_UPGRADEABLE_DIFFABLE_FIELDS,
  FIELDS_TO_UPGRADE_TO_CURRENT_VERSION,
} from '../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import type { RuleTriad } from '../../model/rule_groups/get_rule_groups';

describe('getFieldPredefinedValue', () => {
  const mockUpgradeableRule = {
    current: {
      rule_id: 'current_rule_id',
      type: 'query',
      enabled: true,
      name: 'Current Rule',
      description: 'Current description',
      version: 1,
      author: ['Current Author'],
      license: 'Current License',
    },
    target: {
      rule_id: 'target_rule_id',
      type: 'query',
      enabled: false,
      name: 'Target Rule',
      description: 'Target description',
      version: 2,
      author: ['Target Author'],
      license: 'Target License',
    },
  } as RuleTriad;

  it('should return PREDEFINED_VALUE with target value for fields in NON_UPGRADEABLE_DIFFABLE_FIELDS', () => {
    NON_UPGRADEABLE_DIFFABLE_FIELDS.forEach((field) => {
      const result = getFieldPredefinedValue(field as keyof PrebuiltRuleAsset, mockUpgradeableRule);
      expect(result).toEqual({
        type: 'PREDEFINED_VALUE',
        value: mockUpgradeableRule.target[field as keyof PrebuiltRuleAsset],
      });
    });
  });

  it('should return PREDEFINED_VALUE with current value for fields in FIELDS_TO_UPGRADE_TO_CURRENT_VERSION', () => {
    FIELDS_TO_UPGRADE_TO_CURRENT_VERSION.forEach((field) => {
      const result = getFieldPredefinedValue(field as keyof PrebuiltRuleAsset, mockUpgradeableRule);
      expect(result).toEqual({
        type: 'PREDEFINED_VALUE',
        value: mockUpgradeableRule.current[field as keyof PrebuiltRuleAsset],
      });
    });
  });

  it('should return CUSTOMIZABLE_VALUE for fields not in NON_UPGRADEABLE_DIFFABLE_FIELDS or FIELDS_TO_UPGRADE_TO_CURRENT_VERSION', () => {
    const upgradeableField = 'description';
    const result = getFieldPredefinedValue(upgradeableField, mockUpgradeableRule);
    expect(result).toEqual({ type: 'CUSTOMIZABLE_VALUE' });
  });
});
