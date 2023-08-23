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
    expect(flatten).toEqual({
      'bar.item3.itemA.itemAB': 'value AB',
      'bar.item4': 'value 4',
      'bar.item5': 1,
      'bar.item6.0': 1,
      'bar.item6.1': 2,
      'bar.item6.2': 3,
      'foo.item1': 'value 1',
      'foo.item2.itemA': 'value 2',
    });
  });

  it('returns an empty object if no valid object is provided', () => {
    expect(flattenObject({})).toEqual({});
    expect(flattenObject(null)).toEqual({});
    expect(flattenObject(undefined)).toEqual({});
  });
});
