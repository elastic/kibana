/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { changePoints } from '../../../common/__mocks__/artificial_logs/change_points';
import { frequentItems } from '../../../common/__mocks__/artificial_logs/frequent_items';
import { filteredFrequentItems } from '../../../common/__mocks__/artificial_logs/filtered_frequent_items';

import { getFilteredFrequentItems } from './get_filtered_frequent_items';

describe('getFilteredFrequentItems', () => {
  it('filter frequent item set based on provided change points', () => {
    expect(getFilteredFrequentItems(frequentItems, changePoints)).toStrictEqual(
      filteredFrequentItems
    );
  });
});
