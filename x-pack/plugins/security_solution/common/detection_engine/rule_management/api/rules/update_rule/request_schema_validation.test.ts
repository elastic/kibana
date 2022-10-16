/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateRulesSchema } from '../../../../schemas/request/rule_schemas';
import { getUpdateRulesSchemaMock } from '../../../../schemas/request/rule_schemas.mock';
import { validateUpdateRuleSchema } from './request_schema_validation';

describe('Update rule request schema, additional validation', () => {
  test('You cannot omit timeline_title when timeline_id is present', () => {
    const schema: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      timeline_id: '123',
    };
    delete schema.timeline_title;
    const errors = validateUpdateRuleSchema(schema);
    expect(errors).toEqual(['when "timeline_id" exists, "timeline_title" must also exist']);
  });

  test('You cannot have empty string for timeline_title when timeline_id is present', () => {
    const schema: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      timeline_id: '123',
      timeline_title: '',
    };
    const errors = validateUpdateRuleSchema(schema);
    expect(errors).toEqual(['"timeline_title" cannot be an empty string']);
  });

  test('You cannot have timeline_title with an empty timeline_id', () => {
    const schema: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      timeline_id: '',
      timeline_title: 'some-title',
    };
    const errors = validateUpdateRuleSchema(schema);
    expect(errors).toEqual(['"timeline_id" cannot be an empty string']);
  });

  test('You cannot have timeline_title without timeline_id', () => {
    const schema: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      timeline_title: 'some-title',
    };
    delete schema.timeline_id;
    const errors = validateUpdateRuleSchema(schema);
    expect(errors).toEqual(['when "timeline_title" exists, "timeline_id" must also exist']);
  });

  test('You cannot have both an id and a rule_id', () => {
    const schema: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      id: 'some-id',
      rule_id: 'some-rule-id',
    };
    const errors = validateUpdateRuleSchema(schema);
    expect(errors).toEqual(['both "id" and "rule_id" cannot exist, choose one or the other']);
  });

  test('You must set either an id or a rule_id', () => {
    const schema: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
    };
    delete schema.id;
    delete schema.rule_id;
    const errors = validateUpdateRuleSchema(schema);
    expect(errors).toEqual(['either "id" or "rule_id" must be set']);
  });
});
