/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import { UpdateListItemSchema, updateListItemSchema } from './update_list_item_schema';
import { getUpdateListItemSchemaMock } from './update_list_item_schema.mock';

describe('update_list_item_schema', () => {
  test('it should validate a typical list item request', () => {
    const payload = getUpdateListItemSchemaMock();
    const decoded = updateListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "meta" but strip it out', () => {
    const payload = getUpdateListItemSchemaMock();
    const outputPayload = getUpdateListItemSchemaMock();
    delete payload.meta;
    const decoded = updateListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete outputPayload.meta;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: UpdateListItemSchema & {
      extraKey?: string;
    } = getUpdateListItemSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = updateListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
