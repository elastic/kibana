/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildFieldsKeyAsArrayMap } from './build_fields_key_as_array_map';

describe('buildFieldsKeyAsArrayMap()', () => {
  it('returns primitive type if it passed as source', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(buildFieldsKeyAsArrayMap(1 as any)).toEqual({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(buildFieldsKeyAsArrayMap(Infinity as any)).toEqual({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(buildFieldsKeyAsArrayMap(NaN as any)).toEqual({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(buildFieldsKeyAsArrayMap(false as any)).toEqual({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(buildFieldsKeyAsArrayMap(null as any)).toEqual({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(buildFieldsKeyAsArrayMap(undefined as any)).toEqual({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(buildFieldsKeyAsArrayMap([] as any)).toEqual({});
  });
  it('builds map for nested source', () => {
    expect(buildFieldsKeyAsArrayMap({ a: 'b' })).toEqual({ a: ['a'] });
    expect(buildFieldsKeyAsArrayMap({ a: ['b'] })).toEqual({ a: ['a'] });
    expect(buildFieldsKeyAsArrayMap({ a: { b: { c: 1 } } })).toEqual({ 'a.b.c': ['a', 'b', 'c'] });
    expect(buildFieldsKeyAsArrayMap({ a: { b: 'c' }, d: { e: 'f' } })).toEqual({
      'a.b': ['a', 'b'],
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
      'a.b.c': ['a', 'b', 'c'],
    });
  });

  it('builds map for mixed nested and flattened in a path', () => {
    expect(
      buildFieldsKeyAsArrayMap({
        'a.b': { c: { d: 1 } },
      })
    ).toEqual({ 'a.b.c.d': ['a.b', 'c', 'd'] });
  });

  it('does not build map for arrays in a path for source with mixed types of keys', () => {
    expect(
      buildFieldsKeyAsArrayMap({
        'a.b': { c: [{ d: ['1'] }, { d: ['2'] }] },
      })
    ).toEqual({
      'a.b.c.d': ['a.b', 'c', 'd'],
    });
  });
});
