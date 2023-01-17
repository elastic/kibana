/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import type { Either } from 'fp-ts/lib/Either';
import { left } from 'fp-ts/lib/Either';
import type { Errors } from 'io-ts';

import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import type { ErrorSchema } from '../../../../schemas/response/error_schema';
import { ImportRulesResponse } from './response_schema';

describe('Import rules response schema', () => {
  test('it should validate an empty import response with no errors', () => {
    const payload: ImportRulesResponse = {
      success: true,
      success_count: 0,
      rules_count: 0,
      errors: [],
      exceptions_errors: [],
      exceptions_success: true,
      exceptions_success_count: 0,
      action_connectors_success: true,
      action_connectors_success_count: 0,
      action_connectors_errors: [],
      action_connectors_warnings: [],
    };
    const decoded = ImportRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an empty import response with a single error', () => {
    const payload: ImportRulesResponse = {
      success: false,
      success_count: 0,
      rules_count: 0,
      errors: [{ error: { status_code: 400, message: 'some message' } }],
      exceptions_errors: [],
      exceptions_success: true,
      exceptions_success_count: 0,
      action_connectors_success: true,
      action_connectors_success_count: 0,
      action_connectors_errors: [],
      action_connectors_warnings: [],
    };
    const decoded = ImportRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an empty import response with a single exceptions error', () => {
    const payload: ImportRulesResponse = {
      success: false,
      success_count: 0,
      rules_count: 0,
      errors: [],
      exceptions_errors: [{ error: { status_code: 400, message: 'some message' } }],
      exceptions_success: true,
      exceptions_success_count: 0,
      action_connectors_success: true,
      action_connectors_success_count: 0,
      action_connectors_errors: [],
      action_connectors_warnings: [],
    };
    const decoded = ImportRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an empty import response with two errors', () => {
    const payload: ImportRulesResponse = {
      success: false,
      success_count: 0,
      rules_count: 0,
      errors: [
        { error: { status_code: 400, message: 'some message' } },
        { error: { status_code: 500, message: 'some message' } },
      ],
      exceptions_errors: [],
      exceptions_success: true,
      exceptions_success_count: 0,
      action_connectors_success: true,
      action_connectors_success_count: 0,
      action_connectors_errors: [],
      action_connectors_warnings: [],
    };
    const decoded = ImportRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an empty import response with two exception errors', () => {
    const payload: ImportRulesResponse = {
      success: false,
      success_count: 0,
      rules_count: 0,
      errors: [],
      exceptions_errors: [
        { error: { status_code: 400, message: 'some message' } },
        { error: { status_code: 500, message: 'some message' } },
      ],
      exceptions_success: true,
      exceptions_success_count: 0,
      action_connectors_success: true,
      action_connectors_success_count: 0,
      action_connectors_errors: [],
      action_connectors_warnings: [],
    };
    const decoded = ImportRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT validate a success_count that is a negative number', () => {
    const payload: ImportRulesResponse = {
      success: false,
      success_count: -1,
      rules_count: 0,
      errors: [],
      exceptions_errors: [],
      exceptions_success: true,
      exceptions_success_count: 0,
      action_connectors_success: true,
      action_connectors_success_count: 0,
      action_connectors_errors: [],
      action_connectors_warnings: [],
    };
    const decoded = ImportRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "success_count"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a exceptions_success_count that is a negative number', () => {
    const payload: ImportRulesResponse = {
      success: false,
      success_count: 0,
      rules_count: 0,
      errors: [],
      exceptions_errors: [],
      exceptions_success: true,
      exceptions_success_count: -1,
      action_connectors_success: true,
      action_connectors_success_count: 0,
      action_connectors_errors: [],
      action_connectors_warnings: [],
    };
    const decoded = ImportRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "exceptions_success_count"',
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
    const payload: Omit<ImportRulesResponse, 'success'> & { success: string } = {
      success: 'hello',
      success_count: 0,
      rules_count: 0,
      errors: [],
      exceptions_errors: [],
      exceptions_success: true,
      exceptions_success_count: 0,
      action_connectors_success: true,
      action_connectors_success_count: 0,
      action_connectors_errors: [],
      action_connectors_warnings: [],
    };
    const decoded = ImportRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded as UnsafeCastForTest);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "hello" supplied to "success"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a exceptions_success that is not a boolean', () => {
    type UnsafeCastForTest = Either<
      Errors,
      {
        success: boolean;
        exceptions_success: string;
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
    const payload: Omit<ImportRulesResponse, 'exceptions_success'> & {
      exceptions_success: string;
    } = {
      success: true,
      success_count: 0,
      rules_count: 0,
      errors: [],
      exceptions_errors: [],
      exceptions_success: 'hello',
      exceptions_success_count: 0,
      action_connectors_success: true,
      action_connectors_success_count: 0,
      action_connectors_errors: [],
      action_connectors_warnings: [],
    };
    const decoded = ImportRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded as UnsafeCastForTest);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "hello" supplied to "exceptions_success"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a success an extra invalid field', () => {
    const payload: ImportRulesResponse & { invalid_field: string } = {
      success: true,
      success_count: 0,
      rules_count: 0,
      errors: [],
      invalid_field: 'invalid_data',
      exceptions_errors: [],
      exceptions_success: true,
      exceptions_success_count: 0,
      action_connectors_success: true,
      action_connectors_success_count: 0,
      action_connectors_errors: [],
      action_connectors_warnings: [],
    };
    const decoded = ImportRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_field"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an extra field in the second position of the errors array', () => {
    type InvalidError = ErrorSchema & { invalid_data?: string };
    const payload: Omit<ImportRulesResponse, 'errors'> & {
      errors: InvalidError[];
    } = {
      success: true,
      success_count: 0,
      rules_count: 0,
      errors: [
        { error: { status_code: 400, message: 'some message' } },
        { invalid_data: 'something', error: { status_code: 500, message: 'some message' } },
      ],
      exceptions_errors: [],
      exceptions_success: true,
      exceptions_success_count: 0,
      action_connectors_success: true,
      action_connectors_success_count: 0,
      action_connectors_errors: [],
      action_connectors_warnings: [],
    };
    const decoded = ImportRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should validate an empty import response with a single connectors error', () => {
    const payload: ImportRulesResponse = {
      success: false,
      success_count: 0,
      rules_count: 0,
      errors: [],
      exceptions_errors: [],
      exceptions_success: true,
      exceptions_success_count: 0,
      action_connectors_success: true,
      action_connectors_success_count: 0,
      action_connectors_errors: [{ error: { status_code: 400, message: 'some message' } }],
      action_connectors_warnings: [],
    };
    const decoded = ImportRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });
  test('it should validate an empty import response with multiple errors', () => {
    const payload: ImportRulesResponse = {
      success: false,
      success_count: 0,
      rules_count: 0,
      errors: [
        { error: { status_code: 400, message: 'some message' } },
        { error: { status_code: 500, message: 'some message' } },
      ],
      exceptions_errors: [],
      exceptions_success: true,
      exceptions_success_count: 0,
      action_connectors_success: true,
      action_connectors_success_count: 0,
      action_connectors_errors: [{ error: { status_code: 400, message: 'some message' } }],
      action_connectors_warnings: [],
    };
    const decoded = ImportRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });
  test('it should NOT validate action_connectors_success that is not boolean', () => {
    type UnsafeCastForTest = Either<
      Errors,
      {
        success: boolean;
        action_connectors_success: string;
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
    const payload: Omit<ImportRulesResponse, 'action_connectors_success'> & {
      action_connectors_success: string;
    } = {
      success: true,
      success_count: 0,
      rules_count: 0,
      errors: [],
      exceptions_errors: [],
      exceptions_success: true,
      exceptions_success_count: 0,
      action_connectors_success: 'invalid',
      action_connectors_success_count: 0,
      action_connectors_errors: [],
      action_connectors_warnings: [],
    };
    const decoded = ImportRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded as UnsafeCastForTest);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "invalid" supplied to "action_connectors_success"',
    ]);
    expect(message.schema).toEqual({});
  });
  test('it should NOT validate a action_connectors_success_count that is a negative number', () => {
    const payload: ImportRulesResponse = {
      success: false,
      success_count: 0,
      rules_count: 0,
      errors: [],
      exceptions_errors: [],
      exceptions_success: true,
      exceptions_success_count: 0,
      action_connectors_success: true,
      action_connectors_success_count: -1,
      action_connectors_errors: [],
      action_connectors_warnings: [],
    };
    const decoded = ImportRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "action_connectors_success_count"',
    ]);
    expect(message.schema).toEqual({});
  });
  test('it should  validate a action_connectors_warnings after importing successfully', () => {
    const payload: ImportRulesResponse = {
      success: false,
      success_count: 0,
      rules_count: 0,
      errors: [],
      exceptions_errors: [],
      exceptions_success: true,
      exceptions_success_count: 0,
      action_connectors_success: true,
      action_connectors_success_count: 1,
      action_connectors_errors: [],
      action_connectors_warnings: [{ type: 'type', message: 'message', actionPath: 'actionPath' }],
    };
    const decoded = ImportRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });
  test('it should NOT validate a action_connectors_warnings that is not WarningSchema', () => {
    type UnsafeCastForTest = Either<
      Errors,
      {
        success: boolean;
        action_connectors_warnings: string;
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
    const payload: Omit<ImportRulesResponse, 'action_connectors_warnings'> & {
      action_connectors_warnings: string;
    } = {
      success: true,
      success_count: 0,
      rules_count: 0,
      errors: [],
      exceptions_errors: [],
      exceptions_success: true,
      exceptions_success_count: 0,
      action_connectors_success: true,
      action_connectors_success_count: 0,
      action_connectors_errors: [],
      action_connectors_warnings: 'invalid',
    };
    const decoded = ImportRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded as UnsafeCastForTest);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "invalid" supplied to "action_connectors_warnings"',
    ]);
    expect(message.schema).toEqual({});
  });
});
