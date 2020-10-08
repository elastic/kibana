/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../shared_imports';

import { getReadExceptionListItemSchemaMock } from './read_exception_list_item_schema.mock';
import {
  ReadExceptionListItemSchema,
  readExceptionListItemSchema,
} from './read_exception_list_item_schema';

describe('read_exception_list_item_schema', () => {
  test('it should validate a typical exception list request', () => {
    const payload = getReadExceptionListItemSchemaMock();
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "id"', () => {
    const payload = getReadExceptionListItemSchemaMock();
    delete payload.id;
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "item_id"', () => {
    const payload = getReadExceptionListItemSchemaMock();
    delete payload.item_id;
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "namespace_type" but default to "single"', () => {
    const payload = getReadExceptionListItemSchemaMock();
    delete payload.namespace_type;
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getReadExceptionListItemSchemaMock());
  });

  test('it should accept an undefined for "id", "item_id", "namespace_type" but default "namespace_type" to "single"', () => {
    const payload = getReadExceptionListItemSchemaMock();
    delete payload.id;
    delete payload.namespace_type;
    delete payload.item_id;
    const output = getReadExceptionListItemSchemaMock();
    delete output.id;
    delete output.item_id;
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(output);
  });

  test('it should accept an undefined for "id", "item_id"', () => {
    const payload = getReadExceptionListItemSchemaMock();
    delete payload.id;
    delete payload.item_id;
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "id", "namespace_type" but default "namespace_type" to "single"', () => {
    const payload = getReadExceptionListItemSchemaMock();
    delete payload.id;
    delete payload.namespace_type;
    const output = getReadExceptionListItemSchemaMock();
    delete output.id;
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(output);
  });

  test('it should accept an undefined for "item_id", "namespace_type" but default "namespace_type" to "single"', () => {
    const payload = getReadExceptionListItemSchemaMock();
    delete payload.namespace_type;
    delete payload.item_id;
    const output = getReadExceptionListItemSchemaMock();
    delete output.item_id;
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(output);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ReadExceptionListItemSchema & {
      extraKey?: string;
    } = getReadExceptionListItemSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
