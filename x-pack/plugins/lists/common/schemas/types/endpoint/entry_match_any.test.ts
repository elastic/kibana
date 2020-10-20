/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../../shared_imports';
import { getEntryMatchAnyMock } from '../entry_match_any.mock';

import { getEndpointEntryMatchAnyMock } from './entry_match_any.mock';
import { EndpointEntryMatchAny, endpointEntryMatchAny } from './entry_match_any';

describe('endpointEntryMatchAny', () => {
  test('it should validate an entry', () => {
    const payload = getEndpointEntryMatchAnyMock();
    const decoded = endpointEntryMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT validate when operator is "excluded"', () => {
    // Use the generic entry mock so we can test operator: excluded
    const payload = getEntryMatchAnyMock();
    payload.operator = 'excluded';
    const decoded = endpointEntryMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "excluded" supplied to "operator"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when field is empty string', () => {
    const payload: Omit<EndpointEntryMatchAny, 'field'> & { field: string } = {
      ...getEndpointEntryMatchAnyMock(),
      field: '',
    };
    const decoded = endpointEntryMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "field"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when value is empty array', () => {
    const payload: Omit<EndpointEntryMatchAny, 'value'> & { value: string[] } = {
      ...getEndpointEntryMatchAnyMock(),
      value: [],
    };
    const decoded = endpointEntryMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "[]" supplied to "value"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when value is not string array', () => {
    const payload: Omit<EndpointEntryMatchAny, 'value'> & { value: string } = {
      ...getEndpointEntryMatchAnyMock(),
      value: 'some string',
    };
    const decoded = endpointEntryMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some string" supplied to "value"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "type" is not "match_any"', () => {
    const payload: Omit<EndpointEntryMatchAny, 'type'> & { type: string } = {
      ...getEndpointEntryMatchAnyMock(),
      type: 'match',
    };
    const decoded = endpointEntryMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "match" supplied to "type"']);
    expect(message.schema).toEqual({});
  });

  test('it should strip out extra keys', () => {
    const payload: EndpointEntryMatchAny & {
      extraKey?: string;
    } = getEndpointEntryMatchAnyMock();
    payload.extraKey = 'some extra key';
    const decoded = endpointEntryMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getEntryMatchAnyMock());
  });
});
