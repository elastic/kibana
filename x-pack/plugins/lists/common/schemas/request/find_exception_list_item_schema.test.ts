/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';
import { LIST_ID } from '../../constants.mock';

import {
  getFindExceptionListItemSchemaDecodedMock,
  getFindExceptionListItemSchemaDecodedMultipleMock,
  getFindExceptionListItemSchemaMock,
  getFindExceptionListItemSchemaMultipleMock,
} from './find_exception_list_item_schema.mock';
import {
  FindExceptionListItemSchemaPartial,
  FindExceptionListItemSchemaPartialDecoded,
  findExceptionListItemSchema,
} from './find_exception_list_item_schema';

describe('find_list_item_schema', () => {
  test('it should validate a typical find item request', () => {
    const payload = getFindExceptionListItemSchemaMock();
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getFindExceptionListItemSchemaDecodedMock());
  });

  test('it should validate a typical find item request with multiple input strings turned into array elements', () => {
    const payload = getFindExceptionListItemSchemaMultipleMock();
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getFindExceptionListItemSchemaDecodedMultipleMock());
  });

  test('it should validate just a list_id where it decodes into an array for list_id and adds a namespace_type of "single" as an array', () => {
    const payload: FindExceptionListItemSchemaPartial = { list_id: LIST_ID };
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: FindExceptionListItemSchemaPartialDecoded = {
      filter: [],
      list_id: [LIST_ID],
      namespace_type: ['single'],
    };
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with page missing', () => {
    const payload = getFindExceptionListItemSchemaMock();
    delete payload.page;
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindExceptionListItemSchemaDecodedMock();
    delete expected.page;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with pre_page missing', () => {
    const payload = getFindExceptionListItemSchemaMock();
    delete payload.per_page;
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindExceptionListItemSchemaDecodedMock();
    delete expected.per_page;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with filter missing and add filter as an empty array', () => {
    const payload = getFindExceptionListItemSchemaMock();
    delete payload.filter;
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: FindExceptionListItemSchemaPartialDecoded = {
      ...getFindExceptionListItemSchemaDecodedMock(),
      filter: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with sort_field missing', () => {
    const payload = getFindExceptionListItemSchemaMock();
    delete payload.sort_field;
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindExceptionListItemSchemaDecodedMock();
    delete expected.sort_field;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with sort_order missing', () => {
    const payload = getFindExceptionListItemSchemaMock();
    delete payload.sort_order;
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindExceptionListItemSchemaDecodedMock();
    delete expected.sort_order;
    expect(message.schema).toEqual(expected);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: FindExceptionListItemSchemaPartial & {
      extraKey: string;
    } = { ...getFindExceptionListItemSchemaMock(), extraKey: 'some new value' };
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
