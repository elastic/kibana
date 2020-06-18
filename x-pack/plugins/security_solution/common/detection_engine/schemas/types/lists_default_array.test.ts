/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListsDefaultArray } from './lists_default_array';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '../../../test_utils';

describe('lists_default_array', () => {
  test('it should validate an empty array', () => {
    const payload: string[] = [];
    const decoded = ListsDefaultArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of lists', () => {
    const payload = [
      {
        field: 'source.ip',
        values_operator: 'included',
        values_type: 'exists',
      },
      {
        field: 'host.name',
        values_operator: 'excluded',
        values_type: 'match',
        values: [
          {
            name: 'rock01',
          },
        ],
        and: [
          {
            field: 'host.id',
            values_operator: 'included',
            values_type: 'match_all',
            values: [
              {
                name: '123',
              },
              {
                name: '678',
              },
            ],
          },
        ],
      },
    ];
    const decoded = ListsDefaultArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an array of lists that includes a values_operator other than included or excluded', () => {
    const payload = [
      {
        field: 'source.ip',
        values_operator: 'included',
        values_type: 'exists',
      },
      {
        field: 'host.name',
        values_operator: 'excluded',
        values_type: 'exists',
      },
      {
        field: 'host.hostname',
        values_operator: 'jibber jabber',
        values_type: 'exists',
      },
    ];
    const decoded = ListsDefaultArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "jibber jabber" supplied to "values_operator"',
    ]);
    expect(message.schema).toEqual({});
  });

  // TODO - this scenario should never come up, as the values key is forbidden when values_type is "exists" in the incoming schema - need to find a good way to do this in io-ts
  test('it will validate an array of lists that includes "values" when "values_type" is "exists"', () => {
    const payload = [
      {
        field: 'host.name',
        values_operator: 'excluded',
        values_type: 'exists',
        values: [
          {
            name: '127.0.0.1',
          },
        ],
      },
    ];
    const decoded = ListsDefaultArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  // TODO - this scenario should never come up, as the values key is required when values_type is "match" in the incoming schema - need to find a good way to do this in io-ts
  test('it will validate an array of lists that does not include "values" when "values_type" is "match"', () => {
    const payload = [
      {
        field: 'host.name',
        values_operator: 'excluded',
        values_type: 'match',
      },
    ];
    const decoded = ListsDefaultArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  // TODO - this scenario should never come up, as the values key is required when values_type is "match_all" in the incoming schema - need to find a good way to do this in io-ts
  test('it will validate an array of lists that does not include "values" when "values_type" is "match_all"', () => {
    const payload = [
      {
        field: 'host.name',
        values_operator: 'excluded',
        values_type: 'match_all',
      },
    ];
    const decoded = ListsDefaultArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  // TODO - this scenario should never come up, as the values key is required when values_type is "list" in the incoming schema - need to find a good way to do this in io-ts
  test('it should not validate an array of lists that does not include "values" when "values_type" is "list"', () => {
    const payload = [
      {
        field: 'host.name',
        values_operator: 'excluded',
        values_type: 'list',
      },
    ];
    const decoded = ListsDefaultArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an array with a number', () => {
    const payload = [
      {
        field: 'source.ip',
        values_operator: 'included',
        values_type: 'exists',
        values: [
          {
            name: '127.0.0.1',
          },
        ],
      },
      5,
    ];
    const decoded = ListsDefaultArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "listsWithDefaultArray"',
      'Invalid value "5" supplied to "listsWithDefaultArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default array entry', () => {
    const payload = null;
    const decoded = ListsDefaultArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });
});
