/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryRuleByIds } from './query_rule_by_ids';
import { validateQueryRuleByIds } from './query_rule_by_ids_validation';

describe('Query rule by IDs schema, additional validation', () => {
  test('You cannot have both an id and a rule_id', () => {
    const schema: QueryRuleByIds = {
      id: 'some-id',
      rule_id: 'some-rule-id',
    };
    const errors = validateQueryRuleByIds(schema);
    expect(errors).toEqual(['both "id" and "rule_id" cannot exist, choose one or the other']);
  });

  test('You must set either an id or a rule_id', () => {
    const schema: QueryRuleByIds = {};
    const errors = validateQueryRuleByIds(schema);
    expect(errors).toEqual(['either "id" or "rule_id" must be set']);
  });
});
