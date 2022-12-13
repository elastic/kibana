/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fields } from './__mocks__/artificial_logs/fields';
import { frequentItems } from './__mocks__/artificial_logs/frequent_items';
import { changePoints } from './__mocks__/artificial_logs/change_points';

import { getChangePointGroups } from './get_change_point_groups';

describe('getChangePointGroups', () => {
  it('gets change point groups', () => {
    const changePointGroups = getChangePointGroups(frequentItems, changePoints, fields);

    expect(changePointGroups).toEqual([
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
          {
            duplicate: false,
            fieldName: 'url',
            fieldValue: 'login.php',
          },
        ],
        id: '2038579476',
        pValue: 0.010770456205312423,
      },
      {
        docCount: 1981,
        group: [
          {
            duplicate: false,
            fieldName: 'user',
            fieldValue: 'Peter',
          },
        ],
        id: '817080373',
        pValue: 2.7454255728359757e-21,
      },
    ]);
  });
});
