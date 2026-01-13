/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asKeyValuePairs } from './as_key_value_pair';

describe('asKeyValuePairs', () => {
  it('maps a record into an array of `key`:`value` objects', () => {
    const data = {
      'foo.item1': 'value 1',
      'foo.item2.itemA': 'value 2',
      'bar.item3.itemA.itemAB': 'value AB',
      'bar.item4': 'value 4',
      'bar.item5': [1],
      'bar.item6': [1, 2, 3],
    };

    const flatten = asKeyValuePairs(data);
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
    expect(asKeyValuePairs({})).toEqual([]);
    expect(asKeyValuePairs(null)).toEqual([]);
    expect(asKeyValuePairs(undefined)).toEqual([]);
  });
});
