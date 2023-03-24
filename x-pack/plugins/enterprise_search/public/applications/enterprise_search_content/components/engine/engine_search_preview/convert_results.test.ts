/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertResults, flattenObject } from './convert_results';

describe('flattenObject', () => {
  it('flattens an object', () => {
    const obj = {
      a: {
        b: {
          c: 'd',
        },
      },
    };

    expect(flattenObject(obj)).toEqual({
      'a.b.c': 'd',
    });
  });

  it('handles null values', () => {
    const obj = {
      a: {
        b: null,
        c: 'd',
      },
    };

    expect(flattenObject(obj)).toEqual({
      'a.b': null,
      'a.c': 'd',
    });
  });
});

describe('convertResults', () => {
  it('flattens objects and returns arrays of field/value pairs', () => {
    const result = {
      a: {
        _meta: { id: 1337 },
        b: {
          c: 'd',
        },
      },
      e: false,
    };

    expect(convertResults(result)).toEqual([
      {
        field: 'a._meta.id',
        value: '1337',
      },
      {
        field: 'a.b.c',
        value: '"d"',
      },
      {
        field: 'e',
        value: 'false',
      },
    ]);
  });
});
