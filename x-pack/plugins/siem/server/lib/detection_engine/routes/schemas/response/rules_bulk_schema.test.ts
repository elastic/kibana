/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { getBaseResponsePayload, getErrorPayload } from './__mocks__/utils';
import { RulesBulkSchema, rulesBulkSchema } from './rules_bulk_schema';
import { RulesSchema } from './rules_schema';
import { ErrorSchema } from './error_schema';
import { setFeatureFlagsForTestsOnly, unSetFeatureFlagsForTestsOnly } from '../../../feature_flags';
import { exactCheck } from '../../../../../utils/build_validation/exact_check';
import { foldLeftRight, getPaths } from '../../../../../utils/build_validation/__mocks__/utils';

describe('prepackaged_rule_schema', () => {
  beforeAll(() => {
    setFeatureFlagsForTestsOnly();
  });

  afterAll(() => {
    unSetFeatureFlagsForTestsOnly();
  });

  test('it should validate a regular message and and error together with a uuid', () => {
    const payload: RulesBulkSchema = [getBaseResponsePayload(), getErrorPayload()];
    const decoded = rulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([getBaseResponsePayload(), getErrorPayload()]);
  });

  test('it should validate a regular message and and error together when the error has a non UUID', () => {
    const payload: RulesBulkSchema = [getBaseResponsePayload(), getErrorPayload('fake id')];
    const decoded = rulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([getBaseResponsePayload(), getErrorPayload('fake id')]);
  });

  test('it should validate an error', () => {
    const payload: RulesBulkSchema = [getErrorPayload('fake id')];
    const decoded = rulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([getErrorPayload('fake id')]);
  });

  test('it should NOT validate a rule with a deleted value', () => {
    const rule = getBaseResponsePayload();
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
    const error = getErrorPayload('fake id');
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
    const rule: RulesSchema & { invalid_extra_data?: string } = getBaseResponsePayload();
    rule.invalid_extra_data = 'invalid_extra_data';
    const payload: RulesBulkSchema = [rule];
    const decoded = rulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "query" when it has extra data next to a valid error', () => {
    const rule: RulesSchema & { invalid_extra_data?: string } = getBaseResponsePayload();
    rule.invalid_extra_data = 'invalid_extra_data';
    const payload: RulesBulkSchema = [getErrorPayload(), rule];
    const decoded = rulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an error when it has extra data', () => {
    type InvalidError = ErrorSchema & { invalid_extra_data?: string };
    const error: InvalidError = getErrorPayload();
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
    const error: InvalidError = getErrorPayload();
    error.invalid_extra_data = 'invalid';
    const payload: RulesBulkSchema = [getBaseResponsePayload(), error];
    const decoded = rulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });
});
