/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { finalSignificantTermGroups } from '../../../common/__mocks__/artificial_logs/final_significant_term_groups';

import { getGroupTableItems } from './get_group_table_items';

describe('getGroupTableItems', () => {
  it('transforms groups into table items', () => {
    const groupTableItems = getGroupTableItems(finalSignificantTermGroups);

    expect(groupTableItems).toEqual([
      {
        docCount: 632,
        groupItemsSortedByUniqueness: [
          {
            docCount: 632,
            duplicate: 2,
            fieldName: 'user',
            fieldValue: 'Peter',
            pValue: 0.012783309213417932,
          },
          {
            docCount: 790,
            duplicate: 2,
            fieldName: 'url',
            fieldValue: 'login.php',
            pValue: 0.012783309213417932,
          },
        ],
        histogram: undefined,
        id: '1982924514',
        pValue: 0.012783309213417932,
        uniqueItemsCount: 0,
      },
      {
        docCount: 792,
        groupItemsSortedByUniqueness: [
          {
            docCount: 792,
            duplicate: 2,
            fieldName: 'response_code',
            fieldValue: '500',
            pValue: 0.012783309213417932,
          },
          {
            docCount: 792,
            duplicate: 2,
            fieldName: 'url',
            fieldValue: 'home.php',
            pValue: 0.00974308761016614,
          },
        ],
        histogram: undefined,
        id: '2052830342',
        pValue: 0.00974308761016614,
        uniqueItemsCount: 0,
      },
      {
        docCount: 790,
        groupItemsSortedByUniqueness: [
          {
            docCount: 790,
            duplicate: 2,
            fieldName: 'url',
            fieldValue: 'login.php',
            pValue: 0.012783309213417932,
          },
          {
            docCount: 792,
            duplicate: 2,
            fieldName: 'response_code',
            fieldValue: '500',
            pValue: 0.012783309213417932,
          },
        ],
        histogram: undefined,
        id: '3851735068',
        pValue: 0.012783309213417932,
        uniqueItemsCount: 0,
      },
      {
        docCount: 636,
        groupItemsSortedByUniqueness: [
          {
            docCount: 636,
            duplicate: 2,
            fieldName: 'user',
            fieldValue: 'Peter',
            pValue: 0.00974308761016614,
          },
          {
            docCount: 792,
            duplicate: 2,
            fieldName: 'url',
            fieldValue: 'home.php',
            pValue: 0.00974308761016614,
          },
        ],
        histogram: undefined,
        id: '92732022',
        pValue: 0.00974308761016614,
        uniqueItemsCount: 0,
      },
    ]);
  });
});
