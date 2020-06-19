/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import { getReadExceptionListSchemaMock } from './read_exception_list_schema.mock';
import { ReadExceptionListSchema, readExceptionListSchema } from './read_exception_list_schema';

describe('read_exception_list_schema', () => {
  test('it should validate a typical exception list request', () => {
    const payload = getReadExceptionListSchemaMock();
    const decoded = readExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "id"', () => {
    const payload = getReadExceptionListSchemaMock();
    delete payload.id;
    const decoded = readExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "list_id"', () => {
    const payload = getReadExceptionListSchemaMock();
    delete payload.list_id;
    const decoded = readExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "namespace_type" but default to "single"', () => {
    const payload = getReadExceptionListSchemaMock();
    delete payload.namespace_type;
    const decoded = readExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getReadExceptionListSchemaMock());
  });

  test('it should accept an undefined for "id", "list_id", "namespace_type" but default "namespace_type" to "single"', () => {
    const payload = getReadExceptionListSchemaMock();
    delete payload.id;
    delete payload.namespace_type;
    delete payload.list_id;
    const output = getReadExceptionListSchemaMock();
    delete output.id;
    delete output.list_id;
    const decoded = readExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(output);
  });

  test('it should accept an undefined for "id", "list_id"', () => {
    const payload = getReadExceptionListSchemaMock();
    delete payload.id;
    delete payload.list_id;
    const decoded = readExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "id", "namespace_type" but default "namespace_type" to "single"', () => {
    const payload = getReadExceptionListSchemaMock();
    delete payload.id;
    delete payload.namespace_type;
    const output = getReadExceptionListSchemaMock();
    delete output.id;
    const decoded = readExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(output);
  });

  test('it should accept an undefined for "list_id", "namespace_type" but default "namespace_type" to "single"', () => {
    const payload = getReadExceptionListSchemaMock();
    delete payload.namespace_type;
    delete payload.list_id;
    const output = getReadExceptionListSchemaMock();
    delete output.list_id;
    const decoded = readExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(output);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ReadExceptionListSchema & {
      extraKey?: string;
    } = getReadExceptionListSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = readExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
