/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { RulesBulkSchema, rulesBulkSchema } from './rules_bulk_schema';
import { RulesSchema } from './rules_schema';
import { ErrorSchema } from './error_schema';
import { exactCheck } from '../../../exact_check';
import { foldLeftRight, getPaths } from '../../../test_utils';

import { getRulesSchemaMock } from './rules_schema.mocks';
import { getErrorSchemaMock } from './error_schema.mocks';

describe('prepackaged_rule_schema', () => {
  test('it should validate a regular message and and error together with a uuid', () => {
    const payload: RulesBulkSchema = [getRulesSchemaMock(), getErrorSchemaMock()];
    const decoded = rulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([getRulesSchemaMock(), getErrorSchemaMock()]);
  });

  test('it should validate a regular message and and error together when the error has a non UUID', () => {
    const payload: RulesBulkSchema = [getRulesSchemaMock(), getErrorSchemaMock('fake id')];
    const decoded = rulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([getRulesSchemaMock(), getErrorSchemaMock('fake id')]);
  });

  test('it should validate an error', () => {
    const payload: RulesBulkSchema = [getErrorSchemaMock('fake id')];
    const decoded = rulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([getErrorSchemaMock('fake id')]);
  });

  test('it should NOT validate a rule with a deleted value', () => {
    const rule = getRulesSchemaMock();
    delete rule.name;
    const payload: RulesBulkSchema = [rule];
    const decoded = rulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "name"',
      'Invalid value "undefined" supplied to "error"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an invalid error message with a deleted value', () => {
    const error = getErrorSchemaMock('fake id');
    delete error.error;
    const payload: RulesBulkSchema = [error];
    const decoded = rulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "type"',
      'Invalid value "undefined" supplied to "error"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "query" when it has extra data', () => {
    const rule: RulesSchema & { invalid_extra_data?: string } = getRulesSchemaMock();
    rule.invalid_extra_data = 'invalid_extra_data';
    const payload: RulesBulkSchema = [rule];
    const decoded = rulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "query" when it has extra data next to a valid error', () => {
    const rule: RulesSchema & { invalid_extra_data?: string } = getRulesSchemaMock();
    rule.invalid_extra_data = 'invalid_extra_data';
    const payload: RulesBulkSchema = [getErrorSchemaMock(), rule];
    const decoded = rulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an error when it has extra data', () => {
    type InvalidError = ErrorSchema & { invalid_extra_data?: string };
    const error: InvalidError = getErrorSchemaMock();
    error.invalid_extra_data = 'invalid';
    const payload: RulesBulkSchema = [error];
    const decoded = rulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an error when it has extra data next to a valid payload element', () => {
    type InvalidError = ErrorSchema & { invalid_extra_data?: string };
    const error: InvalidError = getErrorSchemaMock();
    error.invalid_extra_data = 'invalid';
    const payload: RulesBulkSchema = [getRulesSchemaMock(), error];
    const decoded = rulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });
});
