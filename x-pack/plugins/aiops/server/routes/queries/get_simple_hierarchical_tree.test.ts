/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePointGroup } from '@kbn/ml-agg-utils';

import { filteredFrequentItems } from './__mocks__/filtered_frequent_items';

import {
  getFieldValuePairCounts,
  getSimpleHierarchicalTree,
  markDuplicates,
} from './get_simple_hierarchical_tree';

const changePointGroups: ChangePointGroup[] = [
  {
    id: 'group-1',
    group: [
      {
        fieldName: 'custom_field.keyword',
        fieldValue: 'deviation',
      },
      {
        fieldName: 'airline',
        fieldValue: 'UAL',
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
      },
      {
        fieldName: 'airline',
        fieldValue: 'AAL',
      },
    ],
    docCount: 49,
    pValue: 0.001,
  },
];

describe('get_simple_hierarchical_tree', () => {
  describe('getFieldValuePairCounts', () => {
    it('returns a nested record with field/value pair counts', () => {
      const fieldValuePairCounts = getFieldValuePairCounts(changePointGroups);

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
  });

  describe('markDuplicates', () => {
    it('marks duplicates based on change point groups', () => {
      const fieldValuePairCounts = getFieldValuePairCounts(changePointGroups);
      const markedDuplicates = markDuplicates(changePointGroups, fieldValuePairCounts);

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
  });

  describe('getSimpleHierarchicalTree', () => {
    it('returns the hierarchical tree', () => {
      const simpleHierarchicalTree = getSimpleHierarchicalTree(filteredFrequentItems, true, false, [
        'response_code',
        'url',
        'user',
      ]);

      // stringify and again parse the tree to remove attached methods
      // and make it comparable against a static representation.
      expect(JSON.parse(JSON.stringify(simpleHierarchicalTree))).toEqual({
        root: {
          name: '',
          set: [],
          docCount: 0,
          pValue: 0,
          children: [
            {
              name: "792/1505 500 home.php '*'",
              set: [
                { fieldName: 'response_code', fieldValue: '500' },
                { fieldName: 'url', fieldValue: 'home.php' },
              ],
              docCount: 792,
              pValue: 0.010770456205312423,
              children: [
                {
                  name: "792/1505 500 home.php '*'",
                  set: [
                    { fieldName: 'response_code', fieldValue: '500' },
                    { fieldName: 'url', fieldValue: 'home.php' },
                  ],
                  docCount: 792,
                  pValue: 0.010770456205312423,
                  children: [],
                },
              ],
            },
          ],
        },
        fields: ['response_code', 'url', 'user'],
      });
    });
  });
});
