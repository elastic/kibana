/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { frequentItemSets } from '../../../common/__mocks__/artificial_logs/frequent_item_sets';
import { getValueCounts } from './get_value_counts';

describe('getValueCounts', () => {
  it('get value counts for field response_code', () => {
    expect(getValueCounts(frequentItemSets, 'response_code')).toEqual({
      '200': 1,
      '404': 1,
      '500': 3,
    });
  });

  it('get value counts for field url', () => {
    expect(getValueCounts(frequentItemSets, 'url')).toEqual({ 'home.php': 6 });
  });

  it('get value counts for field user', () => {
    expect(getValueCounts(frequentItemSets, 'user')).toEqual({
      Mary: 1,
      Paul: 1,
      Peter: 3,
    });
  });
});
