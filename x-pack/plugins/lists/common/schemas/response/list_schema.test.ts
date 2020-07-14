/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import { getListResponseMock } from './list_schema.mock';
import { ListSchema, listSchema } from './list_schema';

describe('list_schema', () => {
  test('it should validate a typical list response', () => {
    const payload = getListResponseMock();
    const decoded = listSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for "id"', () => {
    const payload = getListResponseMock();
    delete payload.id;
    const decoded = listSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "undefined" supplied to "id"']);
    expect(message.schema).toEqual({});
  });

  test('it should accept an undefined for "meta"', () => {
    const payload = getListResponseMock();
    delete payload.meta;
    const decoded = listSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "serializer"', () => {
    const payload = getListResponseMock();
    delete payload.serializer;
    const decoded = listSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "deserializer"', () => {
    const payload = getListResponseMock();
    delete payload.deserializer;
    const decoded = listSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for "created_at"', () => {
    const payload = getListResponseMock();
    delete payload.created_at;
    const decoded = listSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "created_at"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "created_by"', () => {
    const payload = getListResponseMock();
    delete payload.created_by;
    const decoded = listSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "created_by"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "tie_breaker_id"', () => {
    const payload = getListResponseMock();
    delete payload.tie_breaker_id;
    const decoded = listSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "tie_breaker_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "type"', () => {
    const payload = getListResponseMock();
    delete payload.type;
    const decoded = listSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "updated_at"', () => {
    const payload = getListResponseMock();
    delete payload.updated_at;
    const decoded = listSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "updated_at"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "updated_by"', () => {
    const payload = getListResponseMock();
    delete payload.updated_by;
    const decoded = listSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "updated_by"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "name"', () => {
    const payload = getListResponseMock();
    delete payload.name;
    const decoded = listSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "name"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "description"', () => {
    const payload = getListResponseMock();
    delete payload.description;
    const decoded = listSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "description"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ListSchema & { extraKey?: string } = getListResponseMock();
    payload.extraKey = 'some new value';
    const decoded = listSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
