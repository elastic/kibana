/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getCreateRulesSchemaMock,
  getCreateThreatMatchRulesSchemaMock,
} from '../../../../schemas/request/rule_schemas.mock';
import type { CreateRulesSchema } from '../../../../schemas/request/rule_schemas';
import { createRuleValidateTypeDependents } from './create_rules_type_dependents';

describe('create_rules_type_dependents', () => {
  test('You cannot omit timeline_title when timeline_id is present', () => {
    const schema: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      timeline_id: '123',
    };
    delete schema.timeline_title;
    const errors = createRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['when "timeline_id" exists, "timeline_title" must also exist']);
  });

  test('You cannot have empty string for timeline_title when timeline_id is present', () => {
    const schema: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      timeline_id: '123',
      timeline_title: '',
    };
    const errors = createRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['"timeline_title" cannot be an empty string']);
  });

  test('You cannot have timeline_title with an empty timeline_id', () => {
    const schema: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      timeline_id: '',
      timeline_title: 'some-title',
    };
    const errors = createRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['"timeline_id" cannot be an empty string']);
  });

  test('You cannot have timeline_title without timeline_id', () => {
    const schema: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      timeline_title: 'some-title',
    };
    delete schema.timeline_id;
    const errors = createRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['when "timeline_title" exists, "timeline_id" must also exist']);
  });

  test('validates that both "items_per_search" and "concurrent_searches" works when together', () => {
    const schema: CreateRulesSchema = {
      ...getCreateThreatMatchRulesSchemaMock(),
      concurrent_searches: 10,
      items_per_search: 10,
    };
    const errors = createRuleValidateTypeDependents(schema);
    expect(errors).toEqual([]);
  });

  test('does NOT validate when only "items_per_search" is present', () => {
    const schema: CreateRulesSchema = {
      ...getCreateThreatMatchRulesSchemaMock(),
      items_per_search: 10,
    };
    const errors = createRuleValidateTypeDependents(schema);
    expect(errors).toEqual([
      'when "items_per_search" exists, "concurrent_searches" must also exist',
    ]);
  });

  test('does NOT validate when only "concurrent_searches" is present', () => {
    const schema: CreateRulesSchema = {
      ...getCreateThreatMatchRulesSchemaMock(),
      concurrent_searches: 10,
    };
    const errors = createRuleValidateTypeDependents(schema);
    expect(errors).toEqual([
      'when "concurrent_searches" exists, "items_per_search" must also exist',
    ]);
  });
});
