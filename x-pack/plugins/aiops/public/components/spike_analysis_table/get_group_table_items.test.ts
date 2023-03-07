/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { finalChangePointGroups } from '../../../common/__mocks__/artificial_logs/final_change_point_groups';

import { getGroupTableItems } from './get_group_table_items';

describe('getGroupTableItems', () => {
  it('transforms change point groups into table items', () => {
    const groupTableItems = getGroupTableItems(finalChangePointGroups);

    expect(groupTableItems).toEqual([
      {
        docCount: 792,
        group: [
          {
            fieldName: 'response_code',
            fieldValue: '500',
          },
          {
            fieldName: 'url',
            fieldValue: 'home.php',
          },
          {
            fieldName: 'url',
            fieldValue: 'login.php',
          },
        ],
        histogram: undefined,
        id: '2038579476',
        pValue: 0.010770456205312423,
        repeatedValues: [],
      },
      {
        docCount: 1981,
        group: [
          {
            fieldName: 'user',
            fieldValue: 'Peter',
          },
        ],
        histogram: undefined,
        id: '817080373',
        pValue: 2.7454255728359757e-21,
        repeatedValues: [],
      },
    ]);
  });
});
