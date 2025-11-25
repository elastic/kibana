/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compactMap } from './compact_map';

describe('compactMap', () => {
  it('maps to a new array containing no undefined or null slots', () => {
    const values = [0, 1, 2, 3, 4, 5];

    expect(compactMap(values, (value) => (value % 2 === 0 ? `${value}` : undefined))).toEqual([
      '0',
      '2',
      '4',
    ]);

    expect(compactMap(values, (value) => (value % 2 === 1 ? `${value}` : null))).toEqual([
      '1',
      '3',
      '5',
    ]);
  });

  it('removes nullish values, not falsey values', () => {
    const values = [0, null, '', false, undefined, {}];

    expect(compactMap(values, (value) => value)).toEqual([0, '', false, {}]);
  });

  it('maps iterable collections into a new array', () => {
    const values = new Set([0, 1, 1, 2, 3, 4, 4, 5]);

    expect(compactMap(values, (value) => (value % 2 === 0 ? `${value}` : undefined))).toEqual([
      '0',
      '2',
      '4',
    ]);

    const valuesMap = new Map([
      ['a', 1],
      ['b', 2],
      ['c', 3],
      ['c', 4],
    ]);

    expect(compactMap(valuesMap, ([key, value]) => (key === 'b' ? null : value))).toEqual([1, 4]);
  });
});
