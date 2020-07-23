/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import {
  UpdateExceptionListSchema,
  updateExceptionListSchema,
} from './update_exception_list_schema';
import { getUpdateExceptionListSchemaMock } from './update_exception_list_schema.mock';

describe('update_exception_list_schema', () => {
  test('it should validate a typical exception list request', () => {
    const payload = getUpdateExceptionListSchemaMock();
    const decoded = updateExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not accept an undefined for "description"', () => {
    const payload = getUpdateExceptionListSchemaMock();
    delete payload.description;
    const decoded = updateExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "description"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not accept an undefined for "name"', () => {
    const payload = getUpdateExceptionListSchemaMock();
    delete payload.name;
    const decoded = updateExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "name"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not accept an undefined for "type"', () => {
    const payload = getUpdateExceptionListSchemaMock();
    delete payload.type;
    const decoded = updateExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should accept an undefined for "meta" but strip it out', () => {
    const payload = getUpdateExceptionListSchemaMock();
    const outputPayload = getUpdateExceptionListSchemaMock();
    delete payload.meta;
    const decoded = updateExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete outputPayload.meta;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should accept an undefined for "namespace_type" but return enum "single"', () => {
    const inputPayload = getUpdateExceptionListSchemaMock();
    const outputPayload = getUpdateExceptionListSchemaMock();
    delete inputPayload.namespace_type;
    outputPayload.namespace_type = 'single';
    const decoded = updateExceptionListSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should accept an undefined for "tags" but return an array', () => {
    const inputPayload = getUpdateExceptionListSchemaMock();
    const outputPayload = getUpdateExceptionListSchemaMock();
    delete inputPayload.tags;
    outputPayload.tags = [];
    const decoded = updateExceptionListSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should accept an undefined for "_tags" but return an array', () => {
    const inputPayload = getUpdateExceptionListSchemaMock();
    const outputPayload = getUpdateExceptionListSchemaMock();
    delete inputPayload._tags;
    outputPayload._tags = [];
    const decoded = updateExceptionListSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should accept an undefined for "list_id" and generate a correct body not counting the uuid', () => {
    const inputPayload = getUpdateExceptionListSchemaMock();
    delete inputPayload.list_id;
    const decoded = updateExceptionListSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as UpdateExceptionListSchema).list_id;
    expect(message.schema).toEqual(inputPayload);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: UpdateExceptionListSchema & {
      extraKey?: string;
    } = getUpdateExceptionListSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = updateExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
