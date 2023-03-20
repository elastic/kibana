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
        docCount: 792,
        group: [],
        mostSignificantValues: [
          {
            fieldName: 'response_code',
            fieldValue: '500',
            docCount: 792,
            duplicate: 2,
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
        histogram: undefined,
        id: '40215074',
        pValue: 0.010770456205312423,
      },
      {
        docCount: 792,
        group: [],
        mostSignificantValues: [
          {
            fieldName: 'response_code',
            fieldValue: '500',
            docCount: 792,
            duplicate: 2,
            pValue: 0.010770456205312423,
          },
          {
            fieldName: 'url',
            fieldValue: 'login.php',
            docCount: 792,
            duplicate: 2,
            pValue: 0.010770456205312423,
          },
        ],
        histogram: undefined,
        id: '237328782',
        pValue: 0.010770456205312423,
      },
      {
        docCount: 634,
        group: [],
        histogram: undefined,
        id: '47022118',
        mostSignificantValues: [
          {
            fieldName: 'user',
            fieldValue: 'Peter',
            docCount: 634,
            duplicate: 2,
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
        pValue: 0.010770456205312423,
      },
      {
        docCount: 634,
        group: [],
        mostSignificantValues: [
          {
            fieldName: 'user',
            fieldValue: 'Peter',
            docCount: 634,
            duplicate: 2,
            pValue: 0.010770456205312423,
          },
          {
            fieldName: 'url',
            fieldValue: 'login.php',
            docCount: 792,
            duplicate: 2,
            pValue: 0.010770456205312423,
          },
        ],
        histogram: undefined,
        id: '1176404482',
        pValue: 0.010770456205312423,
      },
    ]);
  });
});
