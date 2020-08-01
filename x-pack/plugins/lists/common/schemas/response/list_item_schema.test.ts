/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../shared_imports';

import { getListItemResponseMock } from './list_item_schema.mock';
import { ListItemSchema, listItemSchema } from './list_item_schema';

describe('list_item_schema', () => {
  test('it should validate a typical list item response', () => {
    const payload = getListItemResponseMock();
    const decoded = listItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for "id"', () => {
    const payload = getListItemResponseMock();
    // @ts-expect-error
    delete payload.id;
    const decoded = listItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "undefined" supplied to "id"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "list_id"', () => {
    const payload = getListItemResponseMock();
    // @ts-expect-error
    delete payload.list_id;
    const decoded = listItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "list_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should accept an undefined for "meta"', () => {
    const payload = getListItemResponseMock();
    delete payload.meta;
    const decoded = listItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "serializer"', () => {
    const payload = getListItemResponseMock();
    delete payload.serializer;
    const decoded = listItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "deserializer"', () => {
    const payload = getListItemResponseMock();
    delete payload.deserializer;
    const decoded = listItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for "created_at"', () => {
    const payload = getListItemResponseMock();
    // @ts-expect-error
    delete payload.created_at;
    const decoded = listItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "created_at"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "created_by"', () => {
    const payload = getListItemResponseMock();
    // @ts-expect-error
    delete payload.created_by;
    const decoded = listItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "created_by"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "tie_breaker_id"', () => {
    const payload = getListItemResponseMock();
    // @ts-expect-error
    delete payload.tie_breaker_id;
    const decoded = listItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "tie_breaker_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "type"', () => {
    const payload = getListItemResponseMock();
    // @ts-expect-error
    delete payload.type;
    const decoded = listItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "updated_at"', () => {
    const payload = getListItemResponseMock();
    // @ts-expect-error
    delete payload.updated_at;
    const decoded = listItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "updated_at"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "updated_by"', () => {
    const payload = getListItemResponseMock();
    // @ts-expect-error
    delete payload.updated_by;
    const decoded = listItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "updated_by"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "value"', () => {
    const payload = getListItemResponseMock();
    // @ts-expect-error
    delete payload.value;
    const decoded = listItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "value"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ListItemSchema & { extraKey?: string } = getListItemResponseMock();
    payload.extraKey = 'some new value';
    const decoded = listItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
