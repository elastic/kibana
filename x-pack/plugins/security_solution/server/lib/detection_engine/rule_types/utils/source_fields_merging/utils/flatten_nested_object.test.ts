/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenNestedObject } from './flatten_nested_object';

describe('flattenNestedObject()', () => {
  it('returns primitive type', () => {
    expect(flattenNestedObject(1 as any)).toEqual(1);
    expect(flattenNestedObject(Infinity as any)).toEqual(Infinity);
    expect(flattenNestedObject(NaN as any)).toEqual(NaN);
    expect(flattenNestedObject(false as any)).toEqual(false);
    expect(flattenNestedObject(null as any)).toEqual(null);
    expect(flattenNestedObject(undefined as any)).toEqual(undefined);
    expect(flattenNestedObject([])).toEqual([]);
  });
  it('flattens objects', () => {
    expect(flattenNestedObject({ a: 'b' })).toEqual({ a: ['b'] });
    expect(flattenNestedObject({ a: { b: 'c' } })).toEqual({ 'a.b': ['c'] });
    expect(flattenNestedObject({ a: { b: 'c' }, d: { e: 'f' } })).toEqual({
      'a.b': ['c'],
      'd.e': ['f'],
    });
  });

  it('does not flatten arrays', () => {
    expect(flattenNestedObject({ a: ['b'] })).toEqual({ a: ['b'] });
    expect(flattenNestedObject({ a: { b: ['c', 'd'] } })).toEqual({ 'a.b': ['c', 'd'] });
  });

  it('flattens nested object in arrays', () => {
    expect(
      flattenNestedObject({
        'a.b': { c: [{ d: ['1'] }, { d: ['2'] }] },
      })
    ).toEqual({ 'a.b.c.d': ['1', '2'] });
  });
});
