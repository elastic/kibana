/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import { getReadListItemSchemaMock } from './read_list_item_schema.mock';
import { ReadListItemSchema, readListItemSchema } from './read_list_item_schema';

describe('read_list_item_schema', () => {
  test('it should validate a typical list item request', () => {
    const payload = getReadListItemSchemaMock();
    const decoded = readListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "id"', () => {
    const payload = getReadListItemSchemaMock();
    delete payload.id;
    const decoded = readListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "list_id"', () => {
    const payload = getReadListItemSchemaMock();
    delete payload.list_id;
    const decoded = readListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "value"', () => {
    const payload = getReadListItemSchemaMock();
    delete payload.value;
    const decoded = readListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "id", "list_id", "value"', () => {
    const payload = getReadListItemSchemaMock();
    delete payload.id;
    delete payload.value;
    delete payload.list_id;
    const decoded = readListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "id", "list_id"', () => {
    const payload = getReadListItemSchemaMock();
    delete payload.id;
    delete payload.list_id;
    const decoded = readListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "id", "value"', () => {
    const payload = getReadListItemSchemaMock();
    delete payload.id;
    delete payload.value;
    const decoded = readListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "list_id", "value"', () => {
    const payload = getReadListItemSchemaMock();
    delete payload.value;
    delete payload.list_id;
    const decoded = readListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ReadListItemSchema & { extraKey?: string } = getReadListItemSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = readListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
