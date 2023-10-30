/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { significantTermGroups } from '../../../../common/__mocks__/farequote/significant_term_groups';
import { fields } from '../../../../common/__mocks__/artificial_logs/fields';
import { filteredFrequentItemSets } from '../../../../common/__mocks__/artificial_logs/filtered_frequent_item_sets';
import { significantTerms } from '../../../../common/__mocks__/artificial_logs/significant_terms';

import { getFieldValuePairCounts } from './get_field_value_pair_counts';
import { getSimpleHierarchicalTree } from './get_simple_hierarchical_tree';
import { getSimpleHierarchicalTreeLeaves } from './get_simple_hierarchical_tree_leaves';

describe('getFieldValuePairCounts', () => {
  it('returns a nested record with field/value pair counts for farequote', () => {
    const fieldValuePairCounts = getFieldValuePairCounts(significantTermGroups);

    expect(fieldValuePairCounts).toEqual({
      airline: {
        AAL: 1,
        UAL: 1,
      },
      'custom_field.keyword': {
        deviation: 2,
      },
    });
  });

  it('returns a nested record with field/value pair counts for artificial logs', () => {
    const simpleHierarchicalTree = getSimpleHierarchicalTree(
      filteredFrequentItemSets,
      true,
      false,
      significantTerms,
      fields
    );
    const leaves = getSimpleHierarchicalTreeLeaves(simpleHierarchicalTree.root, []);
    const fieldValuePairCounts = getFieldValuePairCounts(leaves);

    expect(fieldValuePairCounts).toEqual({
      response_code: {
        '500': 1,
      },
      url: {
        'home.php': 2,
      },
      user: {
        Peter: 1,
      },
    });
  });
});
