/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import { getExceptionListItemSchemaMock } from './exception_list_item_schema.mock';
import { ExceptionListItemSchema, exceptionListItemSchema } from './exception_list_item_schema';

describe('exception_list_item_schema', () => {
  test('it should validate a typical exception list item response', () => {
    const payload = getExceptionListItemSchemaMock();
    const decoded = exceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for "id"', () => {
    const payload = getExceptionListItemSchemaMock();
    delete payload.id;
    const decoded = exceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "undefined" supplied to "id"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "list_id"', () => {
    const payload = getExceptionListItemSchemaMock();
    delete payload.list_id;
    const decoded = exceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "list_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "item_id"', () => {
    const payload = getExceptionListItemSchemaMock();
    delete payload.item_id;
    const decoded = exceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "item_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "comments"', () => {
    const payload = getExceptionListItemSchemaMock();
    delete payload.comments;
    const decoded = exceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "comments"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "entries"', () => {
    const payload = getExceptionListItemSchemaMock();
    delete payload.entries;
    const decoded = exceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "entries"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "name"', () => {
    const payload = getExceptionListItemSchemaMock();
    delete payload.name;
    const decoded = exceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "name"',
    ]);
    expect(message.schema).toEqual({});
  });

  // TODO: Should this throw an error? "namespace_type" gets auto-populated
  // with default "single", is that desired behavior?
  test.skip('it should NOT accept an undefined for "namespace_type"', () => {
    const payload = getExceptionListItemSchemaMock();
    delete payload.namespace_type;
    const decoded = exceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "namespace_type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "description"', () => {
    const payload = getExceptionListItemSchemaMock();
    delete payload.description;
    const decoded = exceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "description"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should accept an undefined for "meta"', () => {
    const payload = getExceptionListItemSchemaMock();
    delete payload.meta;
    const decoded = exceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for "created_at"', () => {
    const payload = getExceptionListItemSchemaMock();
    delete payload.created_at;
    const decoded = exceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "created_at"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "created_by"', () => {
    const payload = getExceptionListItemSchemaMock();
    delete payload.created_by;
    const decoded = exceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "created_by"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "tie_breaker_id"', () => {
    const payload = getExceptionListItemSchemaMock();
    delete payload.tie_breaker_id;
    const decoded = exceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "tie_breaker_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "type"', () => {
    const payload = getExceptionListItemSchemaMock();
    delete payload.type;
    const decoded = exceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "updated_at"', () => {
    const payload = getExceptionListItemSchemaMock();
    delete payload.updated_at;
    const decoded = exceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "updated_at"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "updated_by"', () => {
    const payload = getExceptionListItemSchemaMock();
    delete payload.updated_by;
    const decoded = exceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "updated_by"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ExceptionListItemSchema & {
      extraKey?: string;
    } = getExceptionListItemSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = exceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
