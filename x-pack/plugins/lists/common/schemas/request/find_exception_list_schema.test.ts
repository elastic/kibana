/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import {
  getFindExceptionListSchemaDecodedMock,
  getFindExceptionListSchemaMock,
} from './find_exception_list_schema.mock';
import {
  FindExceptionListSchemaPartial,
  FindExceptionListSchemaPartialDecoded,
  findExceptionListSchema,
} from './find_exception_list_schema';

describe('find_exception_list_schema', () => {
  test('it should validate a typical find item request', () => {
    const payload = getFindExceptionListSchemaMock();
    const decoded = findExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getFindExceptionListSchemaDecodedMock());
  });

  test('it should validate and empty object since everything is optional and will respond only with namespace_type filled out to be "single"', () => {
    const payload: FindExceptionListSchemaPartial = {};
    const decoded = findExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: FindExceptionListSchemaPartialDecoded = {
      namespace_type: 'single',
    };
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with page missing', () => {
    const payload = getFindExceptionListSchemaMock();
    delete payload.page;
    const decoded = findExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindExceptionListSchemaDecodedMock();
    delete expected.page;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with pre_page missing', () => {
    const payload = getFindExceptionListSchemaMock();
    delete payload.per_page;
    const decoded = findExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindExceptionListSchemaDecodedMock();
    delete expected.per_page;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with filter missing', () => {
    const payload = getFindExceptionListSchemaMock();
    delete payload.filter;
    const decoded = findExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindExceptionListSchemaDecodedMock();
    delete expected.filter;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with sort_field missing', () => {
    const payload = getFindExceptionListSchemaMock();
    delete payload.sort_field;
    const decoded = findExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindExceptionListSchemaDecodedMock();
    delete expected.sort_field;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with sort_order missing', () => {
    const payload = getFindExceptionListSchemaMock();
    delete payload.sort_order;
    const decoded = findExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindExceptionListSchemaDecodedMock();
    delete expected.sort_order;
    expect(message.schema).toEqual(expected);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: FindExceptionListSchemaPartial & {
      extraKey: string;
    } = { ...getFindExceptionListSchemaMock(), extraKey: 'some new value' };
    const decoded = findExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
