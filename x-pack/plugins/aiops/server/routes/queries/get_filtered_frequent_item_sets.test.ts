/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { changePoints } from '../../../common/__mocks__/artificial_logs/change_points';
import { frequentItemSets } from '../../../common/__mocks__/artificial_logs/frequent_item_sets';
import { filteredFrequentItemSets } from '../../../common/__mocks__/artificial_logs/filtered_frequent_item_sets';

import { getFilteredFrequentItemSets } from './get_filtered_frequent_item_sets';

describe('getFilteredFrequentItemSets', () => {
  it('filter frequent item set based on provided change points', () => {
    expect(getFilteredFrequentItemSets(frequentItemSets, changePoints)).toStrictEqual(
      filteredFrequentItemSets
    );
  });
});
