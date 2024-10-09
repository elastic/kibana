/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFieldUpgradeSpecifier } from './create_field_upgrade_specifier';
import {
  PickVersionValuesEnum,
  type DiffableRuleTypes,
} from '../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';

describe('createFieldUpgradeSpecifier', () => {
  const defaultArgs = {
    fieldName: 'name' as keyof PrebuiltRuleAsset,
    globalPickVersion: PickVersionValuesEnum.MERGED,
    ruleId: 'rule-1',
    targetRuleType: 'query' as DiffableRuleTypes,
  };

  it('should return rule-specific pick version when no specific fields are defined', () => {
    const result = createFieldUpgradeSpecifier({
      ...defaultArgs,
      rule: {
        rule_id: 'rule-1',
        pick_version: PickVersionValuesEnum.BASE,
        revision: 1,
        version: 1,
      },
    });
    expect(result).toEqual({ fieldName: 'name', pick_version: PickVersionValuesEnum.BASE });
  });

  it('should return field-specific pick version when defined', () => {
    const result = createFieldUpgradeSpecifier({
      ...defaultArgs,
      fieldName: 'description',
      rule: {
        rule_id: 'rule-1',
        pick_version: PickVersionValuesEnum.TARGET,
        revision: 1,
        version: 1,
        fields: { description: { pick_version: PickVersionValuesEnum.CURRENT } },
      },
    });
    expect(result).toEqual({
      fieldName: 'description',
      pick_version: PickVersionValuesEnum.CURRENT,
    });
  });

  it('should return resolved value for specifc fields with RESOLVED pick versions', () => {
    const result = createFieldUpgradeSpecifier({
      ...defaultArgs,
      fieldName: 'description',
      rule: {
        rule_id: 'rule-1',
        revision: 1,
        version: 1,
        fields: {
          description: { pick_version: 'RESOLVED', resolved_value: 'New description' },
        },
      },
    });
    expect(result).toEqual({
      fieldName: 'description',
      pick_version: 'RESOLVED',
      resolved_value: 'New description',
    });
  });

  it('should throw error for SPECIFIC_RULES mode with non-existent rule', () => {
    expect(() =>
      createFieldUpgradeSpecifier({
        ...defaultArgs,
        ruleId: 'non-existent-rule',
        rule: undefined,
      })
    ).toThrowError('Rule payload for upgradable rule non-existent-rule not found');
  });

  it('should handle fields that require mapping', () => {
    const result = createFieldUpgradeSpecifier({
      ...defaultArgs,
      fieldName: 'index' as keyof PrebuiltRuleAsset,
      rule: {
        rule_id: 'rule-1',
        revision: 1,
        version: 1,
        fields: { data_source: { pick_version: PickVersionValuesEnum.CURRENT } },
      },
    });
    expect(result).toEqual({ fieldName: 'index', pick_version: PickVersionValuesEnum.CURRENT });
  });

  it('should fall back to rule-level pick version when field is not specified', () => {
    const result = createFieldUpgradeSpecifier({
      ...defaultArgs,
      fieldName: 'description',
      rule: {
        rule_id: 'rule-1',
        pick_version: PickVersionValuesEnum.TARGET,
        revision: 1,
        version: 1,
        fields: { name: { pick_version: PickVersionValuesEnum.CURRENT } },
      },
    });
    expect(result).toEqual({
      fieldName: 'description',
      pick_version: PickVersionValuesEnum.TARGET,
    });
  });

  it('should throw error if field is not a valid upgradeable field', () => {
    // machine_learning_job_id field does not match 'eql' target rule type
    expect(() =>
      createFieldUpgradeSpecifier({
        ...defaultArgs,
        targetRuleType: 'eql',
        rule: {
          rule_id: 'rule-1',
          revision: 1,
          version: 1,
          fields: { machine_learning_job_id: { pick_version: PickVersionValuesEnum.CURRENT } },
        },
      })
    ).toThrowError(`machine_learning_job_id is not a valid upgradeable field for type 'eql'`);
  });
});
