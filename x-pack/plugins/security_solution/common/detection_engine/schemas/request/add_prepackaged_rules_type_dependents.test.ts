/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AddPrepackagedRulesSchema } from './add_prepackaged_rules_schema';
import { addPrepackagedRuleValidateTypeDependents } from './add_prepackaged_rules_type_dependents';
import { getAddPrepackagedRulesSchemaMock } from './add_prepackaged_rules_schema.mock';

describe('add_prepackaged_rules_type_dependents', () => {
  test('saved_id is required when type is saved_query and will not validate without out', () => {
    const schema: AddPrepackagedRulesSchema = {
      ...getAddPrepackagedRulesSchemaMock(),
      type: 'saved_query',
    };
    delete schema.saved_id;
    const errors = addPrepackagedRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['when "type" is "saved_query", "saved_id" is required']);
  });

  test('saved_id is required when type is saved_query and validates with it', () => {
    const schema: AddPrepackagedRulesSchema = {
      ...getAddPrepackagedRulesSchemaMock(),
      type: 'saved_query',
      saved_id: '123',
    };
    const errors = addPrepackagedRuleValidateTypeDependents(schema);
    expect(errors).toEqual([]);
  });

  test('You cannot omit timeline_title when timeline_id is present', () => {
    const schema: AddPrepackagedRulesSchema = {
      ...getAddPrepackagedRulesSchemaMock(),
      timeline_id: '123',
    };
    delete schema.timeline_title;
    const errors = addPrepackagedRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['when "timeline_id" exists, "timeline_title" must also exist']);
  });

  test('You cannot have empty string for timeline_title when timeline_id is present', () => {
    const schema: AddPrepackagedRulesSchema = {
      ...getAddPrepackagedRulesSchemaMock(),
      timeline_id: '123',
      timeline_title: '',
    };
    const errors = addPrepackagedRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['"timeline_title" cannot be an empty string']);
  });

  test('You cannot have timeline_title with an empty timeline_id', () => {
    const schema: AddPrepackagedRulesSchema = {
      ...getAddPrepackagedRulesSchemaMock(),
      timeline_id: '',
      timeline_title: 'some-title',
    };
    const errors = addPrepackagedRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['"timeline_id" cannot be an empty string']);
  });

  test('You cannot have timeline_title without timeline_id', () => {
    const schema: AddPrepackagedRulesSchema = {
      ...getAddPrepackagedRulesSchemaMock(),
      timeline_title: 'some-title',
    };
    delete schema.timeline_id;
    const errors = addPrepackagedRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['when "timeline_title" exists, "timeline_id" must also exist']);
  });

  test('threshold is required when type is threshold and validates with it', () => {
    const schema: AddPrepackagedRulesSchema = {
      ...getAddPrepackagedRulesSchemaMock(),
      type: 'threshold',
    };
    const errors = addPrepackagedRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['when "type" is "threshold", "threshold" is required']);
  });

  test('threshold.value is required and has to be bigger than 0 when type is threshold and validates with it', () => {
    const schema: AddPrepackagedRulesSchema = {
      ...getAddPrepackagedRulesSchemaMock(),
      type: 'threshold',
      threshold: {
        field: '',
        value: -1,
      },
    };
    const errors = addPrepackagedRuleValidateTypeDependents(schema);
    expect(errors).toEqual(['"threshold.value" has to be bigger than 0']);
  });
});
