/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../shared_imports';

import { getExceptionListSchemaMock } from './exception_list_schema.mock';
import { ExceptionListSchema, exceptionListSchema } from './exception_list_schema';

describe('exception_list_schema', () => {
  test('it should validate a typical exception list response', () => {
    const payload = getExceptionListSchemaMock();
    const decoded = exceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for "id"', () => {
    const payload = getExceptionListSchemaMock();
    // @ts-expect-error
    delete payload.id;
    const decoded = exceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "undefined" supplied to "id"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "list_id"', () => {
    const payload = getExceptionListSchemaMock();
    // @ts-expect-error
    delete payload.list_id;
    const decoded = exceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "list_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "name"', () => {
    const payload = getExceptionListSchemaMock();
    // @ts-expect-error
    delete payload.name;
    const decoded = exceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "name"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should accept an undefined for "namespace_type" and make "namespace_type" that of "single"', () => {
    const payload = getExceptionListSchemaMock();
    // @ts-expect-error
    delete payload.namespace_type;
    const decoded = exceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as ExceptionListSchema).namespace_type).toEqual('single');
  });

  test('it should NOT accept an undefined for "description"', () => {
    const payload = getExceptionListSchemaMock();
    // @ts-expect-error
    delete payload.description;
    const decoded = exceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "description"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should accept an undefined for "meta"', () => {
    const payload = getExceptionListSchemaMock();
    delete payload.meta;
    const decoded = exceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for "created_at"', () => {
    const payload = getExceptionListSchemaMock();
    // @ts-expect-error
    delete payload.created_at;
    const decoded = exceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "created_at"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "created_by"', () => {
    const payload = getExceptionListSchemaMock();
    // @ts-expect-error
    delete payload.created_by;
    const decoded = exceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "created_by"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "tie_breaker_id"', () => {
    const payload = getExceptionListSchemaMock();
    // @ts-expect-error
    delete payload.tie_breaker_id;
    const decoded = exceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "tie_breaker_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "type"', () => {
    const payload = getExceptionListSchemaMock();
    // @ts-expect-error
    delete payload.type;
    const decoded = exceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "updated_at"', () => {
    const payload = getExceptionListSchemaMock();
    // @ts-expect-error
    delete payload.updated_at;
    const decoded = exceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "updated_at"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "updated_by"', () => {
    const payload = getExceptionListSchemaMock();
    // @ts-expect-error
    delete payload.updated_by;
    const decoded = exceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "updated_by"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ExceptionListSchema & {
      extraKey?: string;
    } = getExceptionListSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = exceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
