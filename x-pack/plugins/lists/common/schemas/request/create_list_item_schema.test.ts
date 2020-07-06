/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import { getCreateListItemSchemaMock } from './create_list_item_schema.mock';
import { CreateListItemSchema, createListItemSchema } from './create_list_item_schema';

describe('create_list_item_schema', () => {
  test('it should validate a typical list item request', () => {
    const payload = getCreateListItemSchemaMock();
    const decoded = createListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for an id', () => {
    const payload = getCreateListItemSchemaMock();
    delete payload.id;
    const decoded = createListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for meta', () => {
    const payload = getCreateListItemSchemaMock();
    delete payload.meta;
    const decoded = createListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: CreateListItemSchema & { extraKey?: string } = getCreateListItemSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = createListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
