/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fields } from '../../../common/__mocks__/artificial_logs/fields';
import { filteredFrequentItems } from '../../../common/__mocks__/artificial_logs/filtered_frequent_items';

import { getSimpleHierarchicalTree } from './get_simple_hierarchical_tree';
import { getSimpleHierarchicalTreeLeaves } from './get_simple_hierarchical_tree_leaves';

describe('getSimpleHierarchicalTreeLeaves', () => {
  it('returns the hierarchical tree leaves', () => {
    const simpleHierarchicalTree = getSimpleHierarchicalTree(
      filteredFrequentItems,
      true,
      false,
      fields
    );
    const leaves = getSimpleHierarchicalTreeLeaves(simpleHierarchicalTree.root, []);
    expect(leaves).toEqual([
      {
        id: '2038579476',
        group: [
          { fieldName: 'response_code', fieldValue: '500' },
          { fieldName: 'url', fieldValue: 'home.php' },
        ],
        docCount: 792,
        pValue: 0.010770456205312423,
      },
    ]);
  });
});
