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
            key: 'user:Peter',
            type: 'keyword',
            fieldName: 'user',
            fieldValue: 'Peter',
            docCount: 632,
            duplicate: 2,
            pValue: 0.012783309213417932,
          },
          {
            key: 'url:login.php',
            type: 'keyword',
            fieldName: 'url',
            fieldValue: 'login.php',
            docCount: 790,
            duplicate: 2,
            pValue: 0.012783309213417932,
          },
        ],
        histogram: undefined,
        id: '1937394803',
        pValue: 0.012783309213417932,
        uniqueItemsCount: 0,
      },
      {
        docCount: 792,
        groupItemsSortedByUniqueness: [
          {
            key: 'response_code:500',
            type: 'keyword',
            fieldName: 'response_code',
            fieldValue: '500',
            docCount: 792,
            duplicate: 2,
            pValue: 0.012783309213417932,
          },
          {
            key: 'url:home.php',
            type: 'keyword',
            fieldName: 'url',
            fieldValue: 'home.php',
            docCount: 792,
            duplicate: 2,
            pValue: 0.00974308761016614,
          },
        ],
        histogram: undefined,
        id: '2675980076',
        pValue: 0.00974308761016614,
        uniqueItemsCount: 0,
      },
      {
        docCount: 790,
        groupItemsSortedByUniqueness: [
          {
            key: 'url:login.php',
            type: 'keyword',
            fieldName: 'url',
            fieldValue: 'login.php',
            docCount: 790,
            duplicate: 2,
            pValue: 0.012783309213417932,
          },
          {
            key: 'response_code:500',
            type: 'keyword',
            fieldName: 'response_code',
            fieldValue: '500',
            docCount: 792,
            duplicate: 2,
            pValue: 0.012783309213417932,
          },
        ],
        histogram: undefined,
        id: '3819687732',
        pValue: 0.012783309213417932,
        uniqueItemsCount: 0,
      },
      {
        docCount: 636,
        groupItemsSortedByUniqueness: [
          {
            key: 'user:Peter',
            type: 'keyword',
            fieldName: 'user',
            fieldValue: 'Peter',
            docCount: 636,
            duplicate: 2,
            pValue: 0.00974308761016614,
          },
          {
            key: 'url:home.php',
            type: 'keyword',
            fieldName: 'url',
            fieldValue: 'home.php',
            docCount: 792,
            duplicate: 2,
            pValue: 0.00974308761016614,
          },
        ],
        histogram: undefined,
        id: '2091742187',
        pValue: 0.00974308761016614,
        uniqueItemsCount: 0,
      },
    ]);
  });
});
