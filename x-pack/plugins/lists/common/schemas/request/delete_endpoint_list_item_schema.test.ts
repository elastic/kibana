/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../shared_imports';

import {
  DeleteEndpointListItemSchema,
  deleteEndpointListItemSchema,
} from './delete_endpoint_list_item_schema';
import { getDeleteEndpointListItemSchemaMock } from './delete_endpoint_list_item_schema.mock';

describe('delete_endpoint_list_item_schema', () => {
  test('it should validate a typical endpoint list item request', () => {
    const payload = getDeleteEndpointListItemSchemaMock();
    const decoded = deleteEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept a value for "namespace_type" since it does not require one', () => {
    const payload: DeleteEndpointListItemSchema & {
      namespace_type: string;
    } = { ...getDeleteEndpointListItemSchemaMock(), namespace_type: 'single' };
    // @ts-expect-error
    delete payload.namespace_type;
    const decoded = deleteEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getDeleteEndpointListItemSchemaMock());
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: DeleteEndpointListItemSchema & {
      extraKey?: string;
    } = { ...getDeleteEndpointListItemSchemaMock(), extraKey: 'some new value' };
    const decoded = deleteEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
