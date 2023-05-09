/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenNestedObject } from './flatten_nested_object';

describe('flattenNestedObject()', () => {
  it('returns primitive type if it passed as source', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(flattenNestedObject(1 as any)).toEqual(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(flattenNestedObject(Infinity as any)).toEqual(Infinity);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(flattenNestedObject(NaN as any)).toEqual(NaN);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(flattenNestedObject(false as any)).toEqual(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(flattenNestedObject(null as any)).toEqual(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(flattenNestedObject(undefined as any)).toEqual(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(flattenNestedObject([] as any)).toEqual([]);
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

  it('flattens single nested objects in array', () => {
    expect(
      flattenNestedObject({
        'a.b': { c: [{ d: ['1'] }, { d: ['2'] }] },
      })
    ).toEqual({ 'a.b.c.d': ['1', '2'] });
  });

  it('flattens single nested objects in array with dot notation', () => {
    expect(
      flattenNestedObject({
        'a.b': { c: [{ 'd.e': [1] }, { 'd.e': [2] }] },
      })
    ).toEqual({ 'a.b.c.d.e': [1, 2] });
  });

  it('flattens nested objects and primitive values in array', () => {
    expect(
      flattenNestedObject({
        'a.b': { c: [1, { d: [2] }] },
      })
    ).toEqual({ 'a.b.c': [1], 'a.b.c.d': [2] });
  });

  it('flattens multiple nested objects in arrays', () => {
    expect(
      flattenNestedObject({
        'a.b': { c: [{ d: [{ e: 'test-1' }, { e: 'test-2' }] }, { d: [{ e: 'test-3' }] }] },
      })
    ).toEqual({ 'a.b.c.d.e': ['test-1', 'test-2', 'test-3'] });
  });
});
