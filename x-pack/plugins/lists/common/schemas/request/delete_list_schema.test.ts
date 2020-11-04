/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../shared_imports';

import { DeleteListSchema, deleteListSchema } from './delete_list_schema';
import { getDeleteListSchemaMock } from './delete_list_schema.mock';

describe('delete_list_schema', () => {
  test('it should validate a typical lists request', () => {
    const payload = getDeleteListSchemaMock();
    const decoded = deleteListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for an id', () => {
    const payload = getDeleteListSchemaMock();
    // @ts-expect-error
    delete payload.id;
    const decoded = deleteListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "undefined" supplied to "id"']);
    expect(message.schema).toEqual({});
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: DeleteListSchema & { extraKey?: string } = getDeleteListSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = deleteListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
