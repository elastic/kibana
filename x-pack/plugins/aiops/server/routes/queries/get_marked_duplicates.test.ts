/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { significantTermGroups } from '../../../common/__mocks__/farequote/significant_term_groups';
import { fields } from '../../../common/__mocks__/artificial_logs/fields';
import { filteredFrequentItemSets } from '../../../common/__mocks__/artificial_logs/filtered_frequent_item_sets';

import { getFieldValuePairCounts } from './get_field_value_pair_counts';
import { getMarkedDuplicates } from './get_marked_duplicates';
import { getSimpleHierarchicalTree } from './get_simple_hierarchical_tree';
import { getSimpleHierarchicalTreeLeaves } from './get_simple_hierarchical_tree_leaves';

describe('markDuplicates', () => {
  it('marks duplicates based on significant terms groups for farequote', () => {
    const fieldValuePairCounts = getFieldValuePairCounts(significantTermGroups);
    const markedDuplicates = getMarkedDuplicates(significantTermGroups, fieldValuePairCounts);

    expect(markedDuplicates).toEqual([
      {
        id: 'group-1',
        group: [
          {
            fieldName: 'custom_field.keyword',
            fieldValue: 'deviation',
            docCount: 101,
            duplicate: 2,
            pValue: 0.01,
          },
          {
            fieldName: 'airline',
            fieldValue: 'UAL',
            docCount: 101,
            duplicate: 1,
            pValue: 0.01,
          },
        ],
        docCount: 101,
        pValue: 0.01,
      },
      {
        id: 'group-2',
        group: [
          {
            fieldName: 'custom_field.keyword',
            fieldValue: 'deviation',
            docCount: 49,
            duplicate: 2,
            pValue: 0.001,
          },
          {
            fieldName: 'airline',
            fieldValue: 'AAL',
            docCount: 49,
            duplicate: 1,
            pValue: 0.001,
          },
        ],
        docCount: 49,
        pValue: 0.001,
      },
    ]);
  });

  it('marks duplicates based on significant terms groups for artificial logs', () => {
    const simpleHierarchicalTree = getSimpleHierarchicalTree(
      filteredFrequentItemSets,
      true,
      false,
      fields
    );
    const leaves = getSimpleHierarchicalTreeLeaves(simpleHierarchicalTree.root, []);
    const fieldValuePairCounts = getFieldValuePairCounts(leaves);
    const markedDuplicates = getMarkedDuplicates(leaves, fieldValuePairCounts);

    expect(markedDuplicates).toEqual([
      {
        id: '40215074',
        group: [
          {
            fieldName: 'response_code',
            fieldValue: '500',
            docCount: 792,
            duplicate: 1,
            pValue: 0.010770456205312423,
          },
          {
            fieldName: 'url',
            fieldValue: 'home.php',
            docCount: 792,
            duplicate: 2,
            pValue: 0.010770456205312423,
          },
        ],
        docCount: 792,
        pValue: 0.010770456205312423,
      },
      {
        id: '47022118',
        group: [
          {
            fieldName: 'url',
            fieldValue: 'home.php',
            docCount: 792,
            duplicate: 2,
            pValue: 0.010770456205312423,
          },
          {
            fieldName: 'user',
            fieldValue: 'Peter',
            docCount: 634,
            duplicate: 1,
            pValue: 0.010770456205312423,
          },
        ],
        docCount: 634,
        pValue: 0.010770456205312423,
      },
    ]);
  });
});
