/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import {
  getFindEndpointListItemSchemaDecodedMock,
  getFindEndpointListItemSchemaMock,
} from './find_endpoint_list_item_schema.mock';
import {
  FindEndpointListItemSchemaPartial,
  findEndpointListItemSchema,
} from './find_endpoint_list_item_schema';

describe('find_endpoint_list_item_schema', () => {
  test('it should validate a typical find item request', () => {
    const payload = getFindEndpointListItemSchemaMock();
    const decoded = findEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getFindEndpointListItemSchemaDecodedMock());
  });

  test('it should validate and empty object since everything is optional and has defaults', () => {
    const payload: FindEndpointListItemSchemaPartial = {};
    const decoded = findEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate with page missing', () => {
    const payload = getFindEndpointListItemSchemaMock();
    delete payload.page;
    const decoded = findEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindEndpointListItemSchemaDecodedMock();
    delete expected.page;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with pre_page missing', () => {
    const payload = getFindEndpointListItemSchemaMock();
    delete payload.per_page;
    const decoded = findEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindEndpointListItemSchemaDecodedMock();
    delete expected.per_page;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with filter missing', () => {
    const payload = getFindEndpointListItemSchemaMock();
    delete payload.filter;
    const decoded = findEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindEndpointListItemSchemaDecodedMock();
    delete expected.filter;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with sort_field missing', () => {
    const payload = getFindEndpointListItemSchemaMock();
    delete payload.sort_field;
    const decoded = findEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindEndpointListItemSchemaDecodedMock();
    delete expected.sort_field;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with sort_order missing', () => {
    const payload = getFindEndpointListItemSchemaMock();
    delete payload.sort_order;
    const decoded = findEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindEndpointListItemSchemaDecodedMock();
    delete expected.sort_order;
    expect(message.schema).toEqual(expected);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: FindEndpointListItemSchemaPartial & {
      extraKey: string;
    } = { ...getFindEndpointListItemSchemaMock(), extraKey: 'some new value' };
    const decoded = findEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
