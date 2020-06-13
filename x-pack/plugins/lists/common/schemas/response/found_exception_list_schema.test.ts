/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import { getExceptionListSchemaMock } from './exception_list_schema.mock';
import { getFoundExceptionListSchemaMock } from './found_exception_list_schema.mock';
import { FoundExceptionListSchema, foundExceptionListSchema } from './found_exception_list_schema';
import { ExceptionListSchema } from './exception_list_schema';

describe('exception_list_schema', () => {
  test('it should validate a typical exception list response', () => {
    const payload = getFoundExceptionListSchemaMock();
    const decoded = foundExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept a malformed exception list item within "data"', () => {
    const item: Omit<ExceptionListSchema, 'entries'> & {
      entries?: string[];
    } = { ...getExceptionListSchemaMock(), entries: ['I should not be here'] };
    const payload: Omit<FoundExceptionListSchema, 'data'> & {
      data?: Array<
        Omit<ExceptionListSchema, 'entries'> & {
          entries?: string[];
        }
      >;
    } = { ...getFoundExceptionListSchemaMock(), data: [item] };
    const decoded = foundExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'invalid keys "entries,["I should not be here"]"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept a string for "page"', () => {
    const payload: Omit<FoundExceptionListSchema, 'page'> & {
      page?: string;
    } = { ...getFoundExceptionListSchemaMock(), page: '1' };
    const decoded = foundExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "1" supplied to "page"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept a string for "per_page"', () => {
    const payload: Omit<FoundExceptionListSchema, 'per_page'> & {
      per_page?: string;
    } = { ...getFoundExceptionListSchemaMock(), per_page: '20' };
    const decoded = foundExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "20" supplied to "per_page"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept a string for "total"', () => {
    const payload: Omit<FoundExceptionListSchema, 'total'> & {
      total?: string;
    } = { ...getFoundExceptionListSchemaMock(), total: '1' };
    const decoded = foundExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "1" supplied to "total"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "page"', () => {
    const payload = getFoundExceptionListSchemaMock();
    delete payload.page;
    const decoded = foundExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "page"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "per_page"', () => {
    const payload = getFoundExceptionListSchemaMock();
    delete payload.per_page;
    const decoded = foundExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "per_page"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "total"', () => {
    const payload = getFoundExceptionListSchemaMock();
    delete payload.total;
    const decoded = foundExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "total"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "data"', () => {
    const payload = getFoundExceptionListSchemaMock();
    delete payload.data;
    const decoded = foundExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "data"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: FoundExceptionListSchema & {
      extraKey?: string;
    } = getFoundExceptionListSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = foundExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
