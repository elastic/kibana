/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fields } from '../../../common/__mocks__/artificial_logs/fields';
import { frequentItemSets } from '../../../common/__mocks__/artificial_logs/frequent_item_sets';
import { significantTerms } from '../../../common/__mocks__/artificial_logs/significant_terms';
import { finalSignificantTermGroups } from '../../../common/__mocks__/artificial_logs/final_significant_term_groups';

import { getSignificantTermGroups } from './get_significant_term_groups';

describe('getSignificantTermGroups', () => {
  it('gets significant terms groups', () => {
    const significantTermGroups = getSignificantTermGroups(
      frequentItemSets,
      significantTerms,
      fields
    );

    expect(significantTermGroups).toEqual(finalSignificantTermGroups);
  });
});
