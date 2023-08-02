/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertResults, flattenObjectPreservingValues } from './convert_results';

describe('flattenObjectPreservingValues', () => {
  it('flattens an object', () => {
    const obj = {
      a: {
        raw: {
          b: {
            c: 'd',
          },
        },
      },
    };

    expect(flattenObjectPreservingValues(obj)).toEqual({
      'a.b.c': { raw: 'd' },
    });
  });

  it('handles null values', () => {
    const obj = {
      a: {
        raw: {
          b: null,
          c: 'd',
        },
      },
    };

    expect(flattenObjectPreservingValues(obj)).toEqual({
      'a.b': { raw: null },
      'a.c': { raw: 'd' },
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
        value: { raw: 1337 },
      },
      {
        field: 'a.b.c',
        value: { raw: 'd' },
      },
      {
        field: 'e',
        value: { raw: false },
      },
    ]);
  });
});
