/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../shared_imports';

import { getExceptionListItemSchemaMock } from './exception_list_item_schema.mock';
import { getFoundExceptionListItemSchemaMock } from './found_exception_list_item_schema.mock';
import {
  FoundExceptionListItemSchema,
  foundExceptionListItemSchema,
} from './found_exception_list_item_schema';
import { ExceptionListItemSchema } from './exception_list_item_schema';

describe('found_exception_list_item_schema', () => {
  test('it should validate a typical exception list response', () => {
    const payload = getFoundExceptionListItemSchemaMock();
    const decoded = foundExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept a malformed exception list item within "data"', () => {
    const item: Omit<ExceptionListItemSchema, 'entries'> & {
      entries?: string;
    } = { ...getExceptionListItemSchemaMock(), entries: 'I should be an array' };
    const payload: Omit<FoundExceptionListItemSchema, 'data'> & {
      data?: Array<
        Omit<ExceptionListItemSchema, 'entries'> & {
          entries?: string;
        }
      >;
    } = { ...getFoundExceptionListItemSchemaMock(), data: [item] };
    const decoded = foundExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "I should be an array" supplied to "data,entries"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept a string for "page"', () => {
    const payload: Omit<FoundExceptionListItemSchema, 'page'> & {
      page?: string;
    } = { ...getFoundExceptionListItemSchemaMock(), page: '1' };
    const decoded = foundExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "1" supplied to "page"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept a string for "per_page"', () => {
    const payload: Omit<FoundExceptionListItemSchema, 'per_page'> & {
      per_page?: string;
    } = { ...getFoundExceptionListItemSchemaMock(), per_page: '20' };
    const decoded = foundExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "20" supplied to "per_page"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept a string for "total"', () => {
    const payload: Omit<FoundExceptionListItemSchema, 'total'> & {
      total?: string;
    } = { ...getFoundExceptionListItemSchemaMock(), total: '1' };
    const decoded = foundExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "1" supplied to "total"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "page"', () => {
    const payload = getFoundExceptionListItemSchemaMock();
    // @ts-expect-error
    delete payload.page;
    const decoded = foundExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "page"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "per_page"', () => {
    const payload = getFoundExceptionListItemSchemaMock();
    // @ts-expect-error
    delete payload.per_page;
    const decoded = foundExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "per_page"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "total"', () => {
    const payload = getFoundExceptionListItemSchemaMock();
    // @ts-expect-error
    delete payload.total;
    const decoded = foundExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "total"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "data"', () => {
    const payload = getFoundExceptionListItemSchemaMock();
    // @ts-expect-error
    delete payload.data;
    const decoded = foundExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "data"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: FoundExceptionListItemSchema & {
      extraKey?: string;
    } = getFoundExceptionListItemSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = foundExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
