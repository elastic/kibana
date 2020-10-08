/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../shared_imports';

import { ImportListItemSchema, importListItemSchema } from './import_list_item_schema';
import { getImportListItemSchemaMock } from './import_list_item_schema.mock';

describe('import_list_item_schema', () => {
  test('it should validate a typical lists request', () => {
    const payload = getImportListItemSchemaMock();
    const decoded = importListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for a file', () => {
    const payload = getImportListItemSchemaMock();
    // @ts-expect-error
    delete payload.file;
    const decoded = importListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "file"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ImportListItemSchema & {
      extraKey?: string;
    } = getImportListItemSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = importListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
