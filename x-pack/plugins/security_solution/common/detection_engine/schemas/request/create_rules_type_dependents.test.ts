/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getCreateRulesSchemaMock,
  getCreateThreatMatchRulesSchemaMock,
} from './create_rules_schema.mock';
import { CreateRulesSchema } from './create_rules_schema';
import { createRuleValidateTypeDependents } from './create_rules_type_dependents';

describe('create_rules_type_dependents', () => {
  test('saved_id is required when type is saved_query and will not validate without out', () => {
    const schema: CreateRulesSchema = { ...getCreateRulesSchemaMock(), type: 'saved_query' };
    delete schema.saved_id;
    const errors = createRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['when "type" is "saved_query", "saved_id" is required']);
  });

  test('saved_id is required when type is saved_query and validates with it', () => {
    const schema: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      type: 'saved_query',
      saved_id: '123',
    };
    const errors = createRuleValidateTypeDependents(schema);
    expect(errors).toEqual([]);
  });

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

  test('threshold is required when type is threshold and validates with it', () => {
    const schema: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      type: 'threshold',
    };
    const errors = createRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['when "type" is "threshold", "threshold" is required']);
  });

  test('threshold.value is required and has to be bigger than 0 when type is threshold and validates with it', () => {
    const schema: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      type: 'threshold',
      threshold: {
        field: '',
        value: -1,
      },
    };
    const errors = createRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['"threshold.value" has to be bigger than 0']);
  });

  test('threat_index, threat_query, and threat_mapping are required when type is "threat_match" and validates with it', () => {
    const schema: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      type: 'threat_match',
    };
    const errors = createRuleValidateTypeDependents(schema);
    expect(errors).toEqual([
      'when "type" is "threat_match", "threat_index" is required',
      'when "type" is "threat_match", "threat_query" is required',
      'when "type" is "threat_match", "threat_mapping" is required',
    ]);
  });

  test('validates with threat_index, threat_query, and threat_mapping when type is "threat_match"', () => {
    const schema = getCreateThreatMatchRulesSchemaMock();
    const { threat_filters: threatFilters, ...noThreatFilters } = schema;
    const errors = createRuleValidateTypeDependents(noThreatFilters);
    expect(errors).toEqual([]);
  });

  test('does NOT validate when threat_mapping is an empty array', () => {
    const schema: CreateRulesSchema = {
      ...getCreateThreatMatchRulesSchemaMock(),
      threat_mapping: [],
    };
    const errors = createRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['threat_mapping" must have at least one element']);
  });

  test('validates with threat_index, threat_query, threat_mapping, and an optional threat_filters, when type is "threat_match"', () => {
    const schema = getCreateThreatMatchRulesSchemaMock();
    const errors = createRuleValidateTypeDependents(schema);
    expect(errors).toEqual([]);
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
