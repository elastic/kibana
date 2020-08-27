/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../shared_imports';

import {
  UpdateExceptionListItemSchema,
  updateExceptionListItemSchema,
} from './update_exception_list_item_schema';
import { getUpdateExceptionListItemSchemaMock } from './update_exception_list_item_schema.mock';

describe('update_exception_list_item_schema', () => {
  test('it should validate a typical exception list item request', () => {
    const payload = getUpdateExceptionListItemSchemaMock();
    const decoded = updateExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not accept an undefined for "description"', () => {
    const payload = getUpdateExceptionListItemSchemaMock();
    // @ts-expect-error
    delete payload.description;
    const decoded = updateExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "description"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not accept an undefined for "name"', () => {
    const payload = getUpdateExceptionListItemSchemaMock();
    // @ts-expect-error
    delete payload.name;
    const decoded = updateExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "name"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not accept an undefined for "type"', () => {
    const payload = getUpdateExceptionListItemSchemaMock();
    // @ts-expect-error
    delete payload.type;
    const decoded = updateExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not accept a value for "list_id"', () => {
    const payload: UpdateExceptionListItemSchema & {
      list_id?: string;
    } = getUpdateExceptionListItemSchemaMock();
    payload.list_id = 'some new list_id';
    const decoded = updateExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "list_id"']);
    expect(message.schema).toEqual({});
  });

  test('it should accept an undefined for "meta" but strip it out', () => {
    const payload = getUpdateExceptionListItemSchemaMock();
    const outputPayload = getUpdateExceptionListItemSchemaMock();
    delete payload.meta;
    const decoded = updateExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete outputPayload.meta;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should accept an undefined for "comments" but return an array', () => {
    const inputPayload = getUpdateExceptionListItemSchemaMock();
    const outputPayload = getUpdateExceptionListItemSchemaMock();
    delete inputPayload.comments;
    outputPayload.comments = [];
    const decoded = updateExceptionListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should NOT accept an undefined for "entries"', () => {
    const inputPayload = getUpdateExceptionListItemSchemaMock();
    const outputPayload = getUpdateExceptionListItemSchemaMock();
    // @ts-expect-error
    delete inputPayload.entries;
    outputPayload.entries = [];
    const decoded = updateExceptionListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "entries"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should accept an undefined for "namespace_type" but return enum "single"', () => {
    const inputPayload = getUpdateExceptionListItemSchemaMock();
    const outputPayload = getUpdateExceptionListItemSchemaMock();
    delete inputPayload.namespace_type;
    outputPayload.namespace_type = 'single';
    const decoded = updateExceptionListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should accept an undefined for "tags" but return an array', () => {
    const inputPayload = getUpdateExceptionListItemSchemaMock();
    const outputPayload = getUpdateExceptionListItemSchemaMock();
    delete inputPayload.tags;
    outputPayload.tags = [];
    const decoded = updateExceptionListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should accept an undefined for "_tags" but return an array', () => {
    const inputPayload = getUpdateExceptionListItemSchemaMock();
    const outputPayload = getUpdateExceptionListItemSchemaMock();
    delete inputPayload._tags;
    outputPayload._tags = [];
    const decoded = updateExceptionListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should accept an undefined for "item_id" and generate a correct body not counting the uuid', () => {
    const inputPayload = getUpdateExceptionListItemSchemaMock();
    delete inputPayload.item_id;
    const decoded = updateExceptionListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as UpdateExceptionListItemSchema).item_id;
    expect(message.schema).toEqual(inputPayload);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: UpdateExceptionListItemSchema & {
      extraKey?: string;
    } = getUpdateExceptionListItemSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = updateExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
