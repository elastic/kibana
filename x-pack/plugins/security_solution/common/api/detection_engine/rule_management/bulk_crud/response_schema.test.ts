/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorSchema, RuleResponse } from '../../model';
import { getErrorSchemaMock } from '../../model/error_schema.mock';
import { getRulesSchemaMock } from '../../model/rule_schema/mocks';

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import { BulkCrudRulesResponse } from './response_schema.gen';

describe('Bulk CRUD rules response schema', () => {
  test('it should validate a regular message and and error together with a uuid', () => {
    const payload: BulkCrudRulesResponse = [getRulesSchemaMock(), getErrorSchemaMock()];

    const result = BulkCrudRulesResponse.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('it should validate a regular message and error together when the error has a non UUID', () => {
    const payload: BulkCrudRulesResponse = [getRulesSchemaMock(), getErrorSchemaMock('fake id')];

    const result = BulkCrudRulesResponse.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('it should validate an error', () => {
    const payload: BulkCrudRulesResponse = [getErrorSchemaMock('fake id')];

    const result = BulkCrudRulesResponse.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('it should NOT validate a rule with a deleted value', () => {
    const rule = getRulesSchemaMock();
    // @ts-expect-error
    delete rule.name;
    const payload: BulkCrudRulesResponse = [rule];

    const result = BulkCrudRulesResponse.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"0.name: Required, 0.error: Required, 0: Unrecognized key(s) in object: 'author', 'created_at', 'updated_at', 'created_by', 'description', 'enabled', 'false_positives', 'from', 'immutable', 'references', 'revision', 'severity', 'severity_mapping', 'updated_by', 'tags', 'to', 'threat', 'version', 'output_index', 'max_signals', 'risk_score', 'risk_score_mapping', 'interval', 'exceptions_list', 'related_integrations', 'required_fields', 'setup', 'throttle', 'actions', 'building_block_type', 'note', 'license', 'outcome', 'alias_target_id', 'alias_purpose', 'timeline_id', 'timeline_title', 'meta', 'rule_name_override', 'timestamp_override', 'timestamp_override_fallback_disabled', 'namespace', 'investigation_fields', 'query', 'type', 'language', 'index', 'data_view_id', 'filters', 'saved_id', 'response_actions', 'alert_suppression'"`
    );
  });

  test('it should NOT validate an invalid error message with a deleted value', () => {
    const error = getErrorSchemaMock('fake id');
    // @ts-expect-error
    delete error.error;
    const payload: BulkCrudRulesResponse = [error];

    const result = BulkCrudRulesResponse.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"0.type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql', 0.error: Required"`
    );
  });

  test('it should omit any extra rule props', () => {
    const rule: RuleResponse & { invalid_extra_data?: string } = getRulesSchemaMock();
    rule.invalid_extra_data = 'invalid_extra_data';
    const payload: BulkCrudRulesResponse = [rule];

    const result = BulkCrudRulesResponse.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual([getRulesSchemaMock()]);
  });

  test('it should NOT validate a type of "query" when it has extra data next to a valid error', () => {
    const rule: RuleResponse & { invalid_extra_data?: string } = getRulesSchemaMock();
    rule.invalid_extra_data = 'invalid_extra_data';
    const payload: BulkCrudRulesResponse = [getErrorSchemaMock(), rule];

    const result = BulkCrudRulesResponse.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual([getErrorSchemaMock(), getRulesSchemaMock()]);
  });

  test('it should NOT validate an error when it has extra data', () => {
    type InvalidError = ErrorSchema & { invalid_extra_data?: string };
    const error: InvalidError = getErrorSchemaMock();
    error.invalid_extra_data = 'invalid';
    const payload: BulkCrudRulesResponse = [error];

    const result = BulkCrudRulesResponse.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"0: Unrecognized key(s) in object: 'invalid_extra_data'"`
    );
  });

  test('it should NOT validate an error when it has extra data next to a valid payload element', () => {
    type InvalidError = ErrorSchema & { invalid_extra_data?: string };
    const error: InvalidError = getErrorSchemaMock();
    error.invalid_extra_data = 'invalid';
    const payload: BulkCrudRulesResponse = [getRulesSchemaMock(), error];

    const result = BulkCrudRulesResponse.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"1: Unrecognized key(s) in object: 'invalid_extra_data'"`
    );
  });
});
