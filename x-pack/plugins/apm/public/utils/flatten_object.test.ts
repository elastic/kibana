/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenObject } from './flatten_object';

describe('FlattenObject', () => {
  it('flattens multi level item', () => {
    const data = {
      foo: {
        item1: 'value 1',
        item2: { itemA: 'value 2' },
      },
      bar: {
        item3: { itemA: { itemAB: 'value AB' } },
        item4: 'value 4',
        item5: [1],
        item6: [1, 2, 3],
      },
    };

    const flatten = flattenObject(data);
    expect(flatten).toEqual([
      { key: 'bar.item3.itemA.itemAB', value: 'value AB' },
      { key: 'bar.item4', value: 'value 4' },
      { key: 'bar.item5', value: 1 },
      { key: 'bar.item6.0', value: 1 },
      { key: 'bar.item6.1', value: 2 },
      { key: 'bar.item6.2', value: 3 },
      { key: 'foo.item1', value: 'value 1' },
      { key: 'foo.item2.itemA', value: 'value 2' },
    ]);
  });
  it('returns an empty array if no valid object is provided', () => {
    expect(flattenObject({})).toEqual([]);
    expect(flattenObject(null)).toEqual([]);
    expect(flattenObject(undefined)).toEqual([]);
  });
});
