/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildFieldsKeyAsArrayMap } from './build_fields_key_as_array_map';

describe('buildFieldsKeyAsArrayMap()', () => {
  it('returns primitive type if it passed as source', () => {
    // @ts-expect-error
    expect(buildFieldsKeyAsArrayMap(1)).toEqual({});
    // @ts-expect-error
    expect(buildFieldsKeyAsArrayMap(Infinity)).toEqual({});
    // @ts-expect-error
    expect(buildFieldsKeyAsArrayMap(NaN)).toEqual({});
    // @ts-expect-error
    expect(buildFieldsKeyAsArrayMap(false)).toEqual({});
    // @ts-expect-error
    expect(buildFieldsKeyAsArrayMap(null)).toEqual({});
    // @ts-expect-error
    expect(buildFieldsKeyAsArrayMap(undefined)).toEqual({});
    // @ts-expect-error
    expect(buildFieldsKeyAsArrayMap([])).toEqual({});
  });
  it('builds map for nested source', () => {
    expect(buildFieldsKeyAsArrayMap({ a: 'b' })).toEqual({ a: ['a'] });
    expect(buildFieldsKeyAsArrayMap({ a: ['b'] })).toEqual({ a: ['a'] });
    expect(buildFieldsKeyAsArrayMap({ a: { b: { c: 1 } } })).toEqual({
      a: ['a'],
      'a.b': ['a', 'b'],
      'a.b.c': ['a', 'b', 'c'],
    });
    expect(buildFieldsKeyAsArrayMap({ a: { b: 'c' }, d: { e: 'f' } })).toEqual({
      a: ['a'],
      'a.b': ['a', 'b'],
      d: ['d'],
      'd.e': ['d', 'e'],
    });
  });

  it('builds map for flattened source', () => {
    expect(buildFieldsKeyAsArrayMap({ a: 'b' })).toEqual({ a: ['a'] });
    expect(buildFieldsKeyAsArrayMap({ 'a.b.c': 1 })).toEqual({ 'a.b.c': ['a.b.c'] });
    expect(buildFieldsKeyAsArrayMap({ 'a.b': 'c', 'd.e': 'f' })).toEqual({
      'a.b': ['a.b'],
      'd.e': ['d.e'],
    });
  });

  it('builds map for arrays in a path', () => {
    expect(buildFieldsKeyAsArrayMap({ a: { b: [{ c: 1 }, { c: 2 }] } })).toEqual({
      a: ['a'],
      'a.b': ['a', 'b'],
      'a.b.c': ['a', 'b', 'c'],
    });
  });

  it('builds map for mixed nested and flattened in a path', () => {
    expect(
      buildFieldsKeyAsArrayMap({
        'a.b': { c: { d: 1 } },
      })
    ).toEqual({
      'a.b': ['a.b'],
      'a.b.c': ['a.b', 'c'],
      'a.b.c.d': ['a.b', 'c', 'd'],
    });
  });
});
