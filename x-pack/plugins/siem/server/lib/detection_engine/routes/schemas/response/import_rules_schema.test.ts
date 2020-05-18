/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left, Either } from 'fp-ts/lib/Either';
import { ImportRulesSchema, importRulesSchema } from './import_rules_schema';
import { ErrorSchema } from './error_schema';
import { setFeatureFlagsForTestsOnly, unSetFeatureFlagsForTestsOnly } from '../../../feature_flags';
import { Errors } from 'io-ts';
import { exactCheck } from '../../../../../../common/exact_check';
import { foldLeftRight, getPaths } from '../../../../../../common/test_utils';

describe('import_rules_schema', () => {
  beforeAll(() => {
    setFeatureFlagsForTestsOnly();
  });

  afterAll(() => {
    unSetFeatureFlagsForTestsOnly();
  });

  test('it should validate an empty import response with no errors', () => {
    const payload: ImportRulesSchema = { success: true, success_count: 0, errors: [] };
    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an empty import response with a single error', () => {
    const payload: ImportRulesSchema = {
      success: false,
      success_count: 0,
      errors: [{ error: { status_code: 400, message: 'some message' } }],
    };
    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an empty import response with two errors', () => {
    const payload: ImportRulesSchema = {
      success: false,
      success_count: 0,
      errors: [
        { error: { status_code: 400, message: 'some message' } },
        { error: { status_code: 500, message: 'some message' } },
      ],
    };
    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT validate a status_count that is a negative number', () => {
    const payload: ImportRulesSchema = {
      success: false,
      success_count: -1,
      errors: [],
    };
    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "success_count"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a success that is not a boolean', () => {
    type UnsafeCastForTest = Either<
      Errors,
      {
        success: string;
        success_count: number;
        errors: Array<
          {
            id?: string | undefined;
            rule_id?: string | undefined;
          } & {
            error: {
              status_code: number;
              message: string;
            };
          }
        >;
      }
    >;
    const payload: Omit<ImportRulesSchema, 'success'> & { success: string } = {
      success: 'hello',
      success_count: 0,
      errors: [],
    };
    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded as UnsafeCastForTest);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "hello" supplied to "success"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a success an extra invalid field', () => {
    const payload: ImportRulesSchema & { invalid_field: string } = {
      success: true,
      success_count: 0,
      errors: [],
      invalid_field: 'invalid_data',
    };
    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_field"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an extra field in the second position of the array', () => {
    type InvalidError = ErrorSchema & { invalid_data?: string };
    const payload: Omit<ImportRulesSchema, 'errors'> & {
      errors: InvalidError[];
    } = {
      success: true,
      success_count: 0,
      errors: [
        { error: { status_code: 400, message: 'some message' } },
        { invalid_data: 'something', error: { status_code: 500, message: 'some message' } },
      ],
    };
    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_data"']);
    expect(message.schema).toEqual({});
  });
});
