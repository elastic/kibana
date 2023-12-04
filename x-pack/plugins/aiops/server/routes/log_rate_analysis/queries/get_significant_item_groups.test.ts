/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';

import { fields } from '../../../../common/__mocks__/artificial_logs/fields';
import { frequentItemSets } from '../../../../common/__mocks__/artificial_logs/frequent_item_sets';
import { significantTerms } from '../../../../common/__mocks__/artificial_logs/significant_terms';
import { finalSignificantItemGroups } from '../../../../common/__mocks__/artificial_logs/final_significant_item_groups';

import { getSignificantItemGroups } from './get_significant_item_groups';

describe('getSignificantItemGroups', () => {
  it('gets significant items groups', () => {
    const significantItemGroups = getSignificantItemGroups(
      frequentItemSets,
      significantTerms,
      fields
    );

    expect(orderBy(significantItemGroups, ['docCount'])).toEqual(
      orderBy(finalSignificantItemGroups, ['docCount'])
    );
  });
});
