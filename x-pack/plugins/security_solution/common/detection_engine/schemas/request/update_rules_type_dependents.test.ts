/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getUpdateRulesSchemaMock } from './update_rules_schema.mock';
import { UpdateRulesSchema } from './update_rules_schema';
import { updateRuleValidateTypeDependents } from './update_rules_type_dependents';

describe('update_rules_type_dependents', () => {
  test('saved_id is required when type is saved_query and will not validate without out', () => {
    const schema: UpdateRulesSchema = { ...getUpdateRulesSchemaMock(), type: 'saved_query' };
    delete schema.saved_id;
    const errors = updateRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['when "type" is "saved_query", "saved_id" is required']);
  });

  test('saved_id is required when type is saved_query and validates with it', () => {
    const schema: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      type: 'saved_query',
      saved_id: '123',
    };
    const errors = updateRuleValidateTypeDependents(schema);
    expect(errors).toEqual([]);
  });

  test('You cannot omit timeline_title when timeline_id is present', () => {
    const schema: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      timeline_id: '123',
    };
    delete schema.timeline_title;
    const errors = updateRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['when "timeline_id" exists, "timeline_title" must also exist']);
  });

  test('You cannot have empty string for timeline_title when timeline_id is present', () => {
    const schema: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      timeline_id: '123',
      timeline_title: '',
    };
    const errors = updateRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['"timeline_title" cannot be an empty string']);
  });

  test('You cannot have timeline_title with an empty timeline_id', () => {
    const schema: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      timeline_id: '',
      timeline_title: 'some-title',
    };
    const errors = updateRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['"timeline_id" cannot be an empty string']);
  });

  test('You cannot have timeline_title without timeline_id', () => {
    const schema: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      timeline_title: 'some-title',
    };
    delete schema.timeline_id;
    const errors = updateRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['when "timeline_title" exists, "timeline_id" must also exist']);
  });

  test('You cannot have both an id and a rule_id', () => {
    const schema: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      id: 'some-id',
      rule_id: 'some-rule-id',
    };
    const errors = updateRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['both "id" and "rule_id" cannot exist, choose one or the other']);
  });

  test('You must set either an id or a rule_id', () => {
    const schema: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
    };
    delete schema.id;
    delete schema.rule_id;
    const errors = updateRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['either "id" or "rule_id" must be set']);
  });

  test('threshold is required when type is threshold and validates with it', () => {
    const schema: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      type: 'threshold',
    };
    const errors = updateRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['when "type" is "threshold", "threshold" is required']);
  });

  test('threshold.value is required and has to be bigger than 0 when type is threshold and validates with it', () => {
    const schema: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      type: 'threshold',
      threshold: {
        field: '',
        value: -1,
      },
    };
    const errors = updateRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['"threshold.value" has to be bigger than 0']);
  });
});
