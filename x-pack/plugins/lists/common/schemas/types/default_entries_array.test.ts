/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../siem_common_deps';

import { DefaultEntryArray } from './default_entries_array';
import { EntriesArray } from './entries';
import { getEntriesArrayMock, getEntryMatchMock, getEntryNestedMock } from './entries.mock';

// NOTE: This may seem weird, but when validating schemas that use a union
// it checks against every item in that union. Since entries consist of 5
// different entry types, it returns 5 of these. To make more readable,
// extracted here.
const returnedSchemaError =
  '"Array<({| field: string, operator: "excluded" | "included", type: "match", value: string |} | {| field: string, operator: "excluded" | "included", type: "match_any", value: DefaultStringArray |} | {| field: string, list: {| id: string, type: "binary" | "boolean" | "byte" | "date" | "date_nanos" | "date_range" | "double" | "double_range" | "float" | "float_range" | "geo_point" | "geo_shape" | "half_float" | "integer" | "integer_range" | "ip" | "ip_range" | "keyword" | "long" | "long_range" | "shape" | "short" | "text" |}, operator: "excluded" | "included", type: "list" |} | {| field: string, operator: "excluded" | "included", type: "exists" |} | {| entries: Array<{| field: string, operator: "excluded" | "included", type: "match", value: string |}>, field: string, type: "nested" |})>"';

describe('default_entries_array', () => {
  test('it should validate an empty array', () => {
    const payload: EntriesArray = [];
    const decoded = DefaultEntryArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of regular and nested entries', () => {
    const payload: EntriesArray = getEntriesArrayMock();
    const decoded = DefaultEntryArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of nested entries', () => {
    const payload: EntriesArray = [{ ...getEntryNestedMock() }];
    const decoded = DefaultEntryArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of non nested entries', () => {
    const payload: EntriesArray = [{ ...getEntryMatchMock() }];
    const decoded = DefaultEntryArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT validate an array of numbers', () => {
    const payload = [1];
    const decoded = DefaultEntryArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    // TODO: Known weird error formatting that is on our list to address
    expect(getPaths(left(message.errors))).toEqual([
      `Invalid value "1" supplied to ${returnedSchemaError}`,
      `Invalid value "1" supplied to ${returnedSchemaError}`,
      `Invalid value "1" supplied to ${returnedSchemaError}`,
      `Invalid value "1" supplied to ${returnedSchemaError}`,
      `Invalid value "1" supplied to ${returnedSchemaError}`,
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an array of strings', () => {
    const payload = ['some string'];
    const decoded = DefaultEntryArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      `Invalid value "some string" supplied to ${returnedSchemaError}`,
      `Invalid value "some string" supplied to ${returnedSchemaError}`,
      `Invalid value "some string" supplied to ${returnedSchemaError}`,
      `Invalid value "some string" supplied to ${returnedSchemaError}`,
      `Invalid value "some string" supplied to ${returnedSchemaError}`,
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default array entry', () => {
    const payload = null;
    const decoded = DefaultEntryArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });
});
