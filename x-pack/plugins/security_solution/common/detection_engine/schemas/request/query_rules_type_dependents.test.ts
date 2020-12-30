/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QueryRulesSchema } from './query_rules_schema';
import { queryRuleValidateTypeDependents } from './query_rules_type_dependents';

describe('query_rules_type_dependents', () => {
  test('You cannot have both an id and a rule_id', () => {
    const schema: QueryRulesSchema = {
      id: 'some-id',
      rule_id: 'some-rule-id',
    };
    const errors = queryRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['both "id" and "rule_id" cannot exist, choose one or the other']);
  });

  test('You must set either an id or a rule_id', () => {
    const schema: QueryRulesSchema = {};
    const errors = queryRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['either "id" or "rule_id" must be set']);
  });
});
