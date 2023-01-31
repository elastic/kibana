/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { changePointGroups } from '../../../common/__mocks__/farequote/change_point_groups';
import { fields } from '../../../common/__mocks__/artificial_logs/fields';
import { filteredFrequentItems } from '../../../common/__mocks__/artificial_logs/filtered_frequent_items';

import { getFieldValuePairCounts } from './get_field_value_pair_counts';
import { getMarkedDuplicates } from './get_marked_duplicates';
import { getSimpleHierarchicalTree } from './get_simple_hierarchical_tree';
import { getSimpleHierarchicalTreeLeaves } from './get_simple_hierarchical_tree_leaves';

describe('markDuplicates', () => {
  it('marks duplicates based on change point groups for farequote', () => {
    const fieldValuePairCounts = getFieldValuePairCounts(changePointGroups);
    const markedDuplicates = getMarkedDuplicates(changePointGroups, fieldValuePairCounts);

    expect(markedDuplicates).toEqual([
      {
        id: 'group-1',
        group: [
          {
            fieldName: 'custom_field.keyword',
            fieldValue: 'deviation',
            duplicate: true,
          },
          {
            fieldName: 'airline',
            fieldValue: 'UAL',
            duplicate: false,
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
            duplicate: true,
          },
          {
            fieldName: 'airline',
            fieldValue: 'AAL',
            duplicate: false,
          },
        ],
        docCount: 49,
        pValue: 0.001,
      },
    ]);
  });

  it('marks duplicates based on change point groups for artificial logs', () => {
    const simpleHierarchicalTree = getSimpleHierarchicalTree(
      filteredFrequentItems,
      true,
      false,
      fields
    );
    const leaves = getSimpleHierarchicalTreeLeaves(simpleHierarchicalTree.root, []);
    const fieldValuePairCounts = getFieldValuePairCounts(leaves);
    const markedDuplicates = getMarkedDuplicates(leaves, fieldValuePairCounts);

    expect(markedDuplicates).toEqual([
      {
        docCount: 792,
        group: [
          {
            duplicate: false,
            fieldName: 'response_code',
            fieldValue: '500',
          },
          {
            duplicate: false,
            fieldName: 'url',
            fieldValue: 'home.php',
          },
        ],
        id: '2038579476',
        pValue: 0.010770456205312423,
      },
    ]);
  });
});
