/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import {
  UpdateEndpointListItemSchema,
  updateEndpointListItemSchema,
} from './update_endpoint_list_item_schema';
import { getUpdateEndpointListItemSchemaMock } from './update_endpoint_list_item_schema.mock';

describe('update_endpoint_list_item_schema', () => {
  test('it should validate a typical list item request', () => {
    const payload = getUpdateEndpointListItemSchemaMock();
    const decoded = updateEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not accept an undefined for "description"', () => {
    const payload = getUpdateEndpointListItemSchemaMock();
    delete payload.description;
    const decoded = updateEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "description"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not accept an undefined for "name"', () => {
    const payload = getUpdateEndpointListItemSchemaMock();
    delete payload.name;
    const decoded = updateEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "name"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not accept an undefined for "type"', () => {
    const payload = getUpdateEndpointListItemSchemaMock();
    delete payload.type;
    const decoded = updateEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not accept a value for "list_id"', () => {
    const payload: UpdateEndpointListItemSchema & {
      list_id?: string;
    } = getUpdateEndpointListItemSchemaMock();
    payload.list_id = 'some new list_id';
    const decoded = updateEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "list_id"']);
    expect(message.schema).toEqual({});
  });

  test('it should accept an undefined for "meta" but strip it out', () => {
    const payload = getUpdateEndpointListItemSchemaMock();
    const outputPayload = getUpdateEndpointListItemSchemaMock();
    delete payload.meta;
    const decoded = updateEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete outputPayload.meta;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should accept an undefined for "comments" but return an array', () => {
    const inputPayload = getUpdateEndpointListItemSchemaMock();
    const outputPayload = getUpdateEndpointListItemSchemaMock();
    delete inputPayload.comments;
    outputPayload.comments = [];
    const decoded = updateEndpointListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should accept an undefined for "entries" but return an array', () => {
    const inputPayload = getUpdateEndpointListItemSchemaMock();
    const outputPayload = getUpdateEndpointListItemSchemaMock();
    delete inputPayload.entries;
    outputPayload.entries = [];
    const decoded = updateEndpointListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should accept an undefined for "tags" but return an array', () => {
    const inputPayload = getUpdateEndpointListItemSchemaMock();
    const outputPayload = getUpdateEndpointListItemSchemaMock();
    delete inputPayload.tags;
    outputPayload.tags = [];
    const decoded = updateEndpointListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should accept an undefined for "_tags" but return an array', () => {
    const inputPayload = getUpdateEndpointListItemSchemaMock();
    const outputPayload = getUpdateEndpointListItemSchemaMock();
    delete inputPayload._tags;
    outputPayload._tags = [];
    const decoded = updateEndpointListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: UpdateEndpointListItemSchema & {
      extraKey?: string;
    } = getUpdateEndpointListItemSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = updateEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
