/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../shared_imports';

import { DeleteListItemSchema, deleteListItemSchema } from './delete_list_item_schema';
import { getDeleteListItemSchemaMock } from './delete_list_item_schema.mock';

describe('delete_list_item_schema', () => {
  test('it should validate a typical list item request', () => {
    const payload = getDeleteListItemSchemaMock();
    const decoded = deleteListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: DeleteListItemSchema & {
      extraKey?: string;
    } = { ...getDeleteListItemSchemaMock(), extraKey: 'some new value' };
    const decoded = deleteListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
