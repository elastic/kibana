/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRulesSchema } from './find_rules_schema';
import { findRuleValidateTypeDependents } from './find_rules_type_dependents';

describe('find_rules_type_dependents', () => {
  test('You can have an empty sort_field and empty sort_order', () => {
    const schema: FindRulesSchema = {};
    const errors = findRuleValidateTypeDependents(schema);
    expect(errors).toEqual([]);
  });

  test('You can have both a sort_field and and a sort_order', () => {
    const schema: FindRulesSchema = {
      sort_field: 'some field',
      sort_order: 'asc',
    };
    const errors = findRuleValidateTypeDependents(schema);
    expect(errors).toEqual([]);
  });

  test('You cannot have sort_field without sort_order', () => {
    const schema: FindRulesSchema = {
      sort_field: 'some field',
    };
    const errors = findRuleValidateTypeDependents(schema);
    expect(errors).toEqual([
      'when "sort_order" and "sort_field" must exist together or not at all',
    ]);
  });

  test('You cannot have sort_order without sort_field', () => {
    const schema: FindRulesSchema = {
      sort_order: 'asc',
    };
    const errors = findRuleValidateTypeDependents(schema);
    expect(errors).toEqual([
      'when "sort_order" and "sort_field" must exist together or not at all',
    ]);
  });
});
