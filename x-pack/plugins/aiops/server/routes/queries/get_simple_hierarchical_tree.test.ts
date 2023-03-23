/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fields } from '../../../common/__mocks__/artificial_logs/fields';
import { filteredFrequentItemSets } from '../../../common/__mocks__/artificial_logs/filtered_frequent_item_sets';

import { getSimpleHierarchicalTree } from './get_simple_hierarchical_tree';

describe('getSimpleHierarchicalTree', () => {
  it('returns the hierarchical tree', () => {
    // stringify and again parse the tree to remove attached methods
    // and make it comparable against a static representation.
    expect(
      JSON.parse(
        JSON.stringify(getSimpleHierarchicalTree(filteredFrequentItemSets, true, false, fields))
      )
    ).toEqual({
      root: {
        name: '',
        set: [],
        docCount: 0,
        pValue: 0,
        children: [
          {
            name: "792/1505 500 home.php '*'",
            set: [
              {
                fieldName: 'response_code',
                fieldValue: '500',
                docCount: 792,
                pValue: 0.010770456205312423,
              },
              {
                fieldName: 'url',
                fieldValue: 'home.php',
                docCount: 792,
                pValue: 0.010770456205312423,
              },
            ],
            docCount: 792,
            pValue: 0.010770456205312423,
            children: [
              {
                name: "792/1505 500 home.php '*'",
                set: [
                  {
                    fieldName: 'response_code',
                    fieldValue: '500',
                    docCount: 792,
                    pValue: 0.010770456205312423,
                  },
                  {
                    fieldName: 'url',
                    fieldValue: 'home.php',
                    docCount: 792,
                    pValue: 0.010770456205312423,
                  },
                ],
                docCount: 792,
                pValue: 0.010770456205312423,
                children: [],
              },
            ],
          },
          {
            children: [
              {
                children: [],
                docCount: 634,
                name: '634/1505 home.php Peter',
                pValue: 0.010770456205312423,
                set: [
                  {
                    docCount: 792,
                    fieldName: 'url',
                    fieldValue: 'home.php',
                    pValue: 0.010770456205312423,
                  },
                  {
                    docCount: 634,
                    fieldName: 'user',
                    fieldValue: 'Peter',
                    pValue: 0.010770456205312423,
                  },
                ],
              },
            ],
            docCount: 792,
            name: '792/1505 home.php',
            pValue: 0.010770456205312423,
            set: [
              {
                docCount: 792,
                fieldName: 'url',
                fieldValue: 'home.php',
                pValue: 0.010770456205312423,
              },
            ],
          },
          {
            children: [],
            docCount: 634,
            name: '634/1505 Peter',
            pValue: 0.010770456205312423,
            set: [
              {
                docCount: 634,
                fieldName: 'user',
                fieldValue: 'Peter',
                pValue: 0.010770456205312423,
              },
            ],
          },
        ],
      },
      fields: ['response_code', 'url', 'user'],
    });
  });
});
