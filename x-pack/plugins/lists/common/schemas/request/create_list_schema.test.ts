/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import { CreateListSchema, createListSchema } from './create_list_schema';
import { getCreateListSchemaMock } from './create_list_schema.mock';

describe('create_list_schema', () => {
  test('it should validate a typical lists request', () => {
    const payload = getCreateListSchemaMock();
    const decoded = createListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for an id', () => {
    const payload = getCreateListSchemaMock();
    delete payload.id;
    const decoded = createListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for meta', () => {
    const payload = getCreateListSchemaMock();
    delete payload.meta;
    const decoded = createListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for serializer', () => {
    const payload = getCreateListSchemaMock();
    delete payload.serializer;
    const decoded = createListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for deserializer', () => {
    const payload = getCreateListSchemaMock();
    delete payload.deserializer;
    const decoded = createListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: CreateListSchema & { extraKey?: string } = getCreateListSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = createListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
