/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import {
  DeleteExceptionListItemSchema,
  deleteExceptionListItemSchema,
} from './delete_exception_list_item_schema';
import { getDeleteExceptionListItemSchemaMock } from './delete_exception_list_item_schema.mock';

describe('delete_exception_list_item_schema', () => {
  test('it should validate a typical exception list item request', () => {
    const payload = getDeleteExceptionListItemSchemaMock();
    const decoded = deleteExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  // TODO It does allow an id of undefined, is this wanted behavior?
  test.skip('it should NOT accept an undefined for an "id"', () => {
    const payload = getDeleteExceptionListItemSchemaMock();
    delete payload.id;
    const decoded = deleteExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "undefined" supplied to "id"']);
    expect(message.schema).toEqual({});
  });

  test('it should accept an undefined for "namespace_type" but default to "single"', () => {
    const payload = getDeleteExceptionListItemSchemaMock();
    delete payload.namespace_type;
    const decoded = deleteExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getDeleteExceptionListItemSchemaMock());
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: DeleteExceptionListItemSchema & {
      extraKey?: string;
    } = getDeleteExceptionListItemSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = deleteExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
