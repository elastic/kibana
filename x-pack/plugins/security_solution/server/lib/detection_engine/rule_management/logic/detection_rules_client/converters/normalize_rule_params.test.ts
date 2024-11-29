/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeRuleSource, normalizeRuleParams } from './normalize_rule_params';
import type { BaseRuleParams } from '../../../../rule_schema';

describe('normalizeRuleSource', () => {
  it('should return rule_source of type `internal` when immutable is false and ruleSource is undefined', () => {
    const result = normalizeRuleSource({
      immutable: false,
      ruleSource: undefined,
    });
    expect(result).toEqual({
      type: 'internal',
    });
  });

  it('should return rule_source of type `external` and `isCustomized: false` when immutable is true and ruleSource is undefined', () => {
    const result = normalizeRuleSource({
      immutable: true,
      ruleSource: undefined,
    });
    expect(result).toEqual({
      type: 'external',
      isCustomized: false,
    });
  });

  it('should return existing value when ruleSource is present', () => {
    const externalRuleSource: BaseRuleParams['ruleSource'] = {
      type: 'external',
      isCustomized: true,
    };
    const externalResult = normalizeRuleSource({ immutable: true, ruleSource: externalRuleSource });
    expect(externalResult).toEqual({
      type: externalRuleSource.type,
      isCustomized: externalRuleSource.isCustomized,
    });

    const internalRuleSource: BaseRuleParams['ruleSource'] = {
      type: 'internal',
    };
    const internalResult = normalizeRuleSource({
      immutable: false,
      ruleSource: internalRuleSource,
    });
    expect(internalResult).toEqual({
      type: internalRuleSource.type,
    });
  });
});

describe('normalizeRuleParams', () => {
  it('migrates legacy investigation fields', () => {
    const params = {
      investigationFields: ['field_1', 'field_2'],
    } as BaseRuleParams;
    const result = normalizeRuleParams(params);

    expect(result.investigationFields).toMatchObject({ field_names: ['field_1', 'field_2'] });
  });
});
