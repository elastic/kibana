/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../../shared_imports';
import { getEntryMatchMock } from '../entry_match.mock';

import { getEndpointEntryMatchMock } from './entry_match.mock';
import { EndpointEntryMatch, endpointEntryMatch } from './entry_match';

describe('endpointEntryMatch', () => {
  test('it should validate an entry', () => {
    const payload = getEndpointEntryMatchMock();
    const decoded = endpointEntryMatch.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT validate when "operator" is "excluded"', () => {
    // Use the generic entry mock so we can test operator: excluded
    const payload = getEntryMatchMock();
    payload.operator = 'excluded';
    const decoded = endpointEntryMatch.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "excluded" supplied to "operator"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "field" is empty string', () => {
    const payload: Omit<EndpointEntryMatch, 'field'> & { field: string } = {
      ...getEndpointEntryMatchMock(),
      field: '',
    };
    const decoded = endpointEntryMatch.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "field"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "value" is not string', () => {
    const payload: Omit<EndpointEntryMatch, 'value'> & { value: string[] } = {
      ...getEndpointEntryMatchMock(),
      value: ['some value'],
    };
    const decoded = endpointEntryMatch.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "["some value"]" supplied to "value"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "value" is empty string', () => {
    const payload: Omit<EndpointEntryMatch, 'value'> & { value: string } = {
      ...getEndpointEntryMatchMock(),
      value: '',
    };
    const decoded = endpointEntryMatch.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "value"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "type" is not "match"', () => {
    const payload: Omit<EndpointEntryMatch, 'type'> & { type: string } = {
      ...getEndpointEntryMatchMock(),
      type: 'match_any',
    };
    const decoded = endpointEntryMatch.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "match_any" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should strip out extra keys', () => {
    const payload: EndpointEntryMatch & {
      extraKey?: string;
    } = getEndpointEntryMatchMock();
    payload.extraKey = 'some value';
    const decoded = endpointEntryMatch.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getEntryMatchMock());
  });
});
