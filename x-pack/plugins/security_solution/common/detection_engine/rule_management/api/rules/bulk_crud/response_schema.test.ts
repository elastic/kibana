/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import type { FullResponseSchema } from '../../../../rule_schema';
import { getRulesSchemaMock } from '../../../../rule_schema/mocks';
import type { ErrorSchema } from '../../../../schemas/response/error_schema';
import { getErrorSchemaMock } from '../../../../schemas/response/error_schema.mocks';

import { BulkCrudRulesResponse } from './response_schema';

describe('Bulk CRUD rules response schema', () => {
  test('it should validate a regular message and and error together with a uuid', () => {
    const payload: BulkCrudRulesResponse = [getRulesSchemaMock(), getErrorSchemaMock()];
    const decoded = BulkCrudRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([getRulesSchemaMock(), getErrorSchemaMock()]);
  });

  test('it should validate a regular message and and error together when the error has a non UUID', () => {
    const payload: BulkCrudRulesResponse = [getRulesSchemaMock(), getErrorSchemaMock('fake id')];
    const decoded = BulkCrudRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([getRulesSchemaMock(), getErrorSchemaMock('fake id')]);
  });

  test('it should validate an error', () => {
    const payload: BulkCrudRulesResponse = [getErrorSchemaMock('fake id')];
    const decoded = BulkCrudRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([getErrorSchemaMock('fake id')]);
  });

  test('it should NOT validate a rule with a deleted value', () => {
    const rule = getRulesSchemaMock();
    // @ts-expect-error
    delete rule.name;
    const payload: BulkCrudRulesResponse = [rule];
    const decoded = BulkCrudRulesResponse.decode(payload);
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
    // @ts-expect-error
    delete error.error;
    const payload: BulkCrudRulesResponse = [error];
    const decoded = BulkCrudRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toContain(
      'Invalid value "undefined" supplied to "error"'
    );
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "query" when it has extra data', () => {
    const rule: FullResponseSchema & { invalid_extra_data?: string } = getRulesSchemaMock();
    rule.invalid_extra_data = 'invalid_extra_data';
    const payload: BulkCrudRulesResponse = [rule];
    const decoded = BulkCrudRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "query" when it has extra data next to a valid error', () => {
    const rule: FullResponseSchema & { invalid_extra_data?: string } = getRulesSchemaMock();
    rule.invalid_extra_data = 'invalid_extra_data';
    const payload: BulkCrudRulesResponse = [getErrorSchemaMock(), rule];
    const decoded = BulkCrudRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an error when it has extra data', () => {
    type InvalidError = ErrorSchema & { invalid_extra_data?: string };
    const error: InvalidError = getErrorSchemaMock();
    error.invalid_extra_data = 'invalid';
    const payload: BulkCrudRulesResponse = [error];
    const decoded = BulkCrudRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an error when it has extra data next to a valid payload element', () => {
    type InvalidError = ErrorSchema & { invalid_extra_data?: string };
    const error: InvalidError = getErrorSchemaMock();
    error.invalid_extra_data = 'invalid';
    const payload: BulkCrudRulesResponse = [getRulesSchemaMock(), error];
    const decoded = BulkCrudRulesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });
});
