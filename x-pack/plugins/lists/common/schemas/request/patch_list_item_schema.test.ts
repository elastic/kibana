/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../shared_imports';

import { getPathListItemSchemaMock } from './patch_list_item_schema.mock';
import { PatchListItemSchema, patchListItemSchema } from './patch_list_item_schema';

describe('patch_list_item_schema', () => {
  test('it should validate a typical list item request', () => {
    const payload = getPathListItemSchemaMock();
    const decoded = patchListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for "id"', () => {
    const payload = getPathListItemSchemaMock();
    // @ts-expect-error
    delete payload.id;
    const decoded = patchListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "undefined" supplied to "id"']);
    expect(message.schema).toEqual({});
  });

  test('it should accept an undefined for "meta"', () => {
    const payload = getPathListItemSchemaMock();
    delete payload.meta;
    const decoded = patchListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "value"', () => {
    const payload = getPathListItemSchemaMock();
    delete payload.value;
    const decoded = patchListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "meta" and "value"', () => {
    const payload = getPathListItemSchemaMock();
    delete payload.meta;
    delete payload.value;
    const decoded = patchListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: PatchListItemSchema & { extraKey?: string } = getPathListItemSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = patchListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
