/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { finalChangePointGroups } from '../../../common/__mocks__/artificial_logs/final_change_point_groups';

import { getGroupFilter } from './get_group_filter';

describe('getGroupFilter', () => {
  it('gets a query filter for the change points of a group with multiple values per field', () => {
    expect(getGroupFilter(finalChangePointGroups[0])).toStrictEqual([
      {
        term: {
          response_code: '500',
        },
      },
      {
        terms: {
          url: ['home.php', 'login.php'],
        },
      },
    ]);
  });

  it('gets a query filter for the change points of a group with just a single field/value', () => {
    expect(getGroupFilter(finalChangePointGroups[1])).toStrictEqual([
      {
        term: {
          user: 'Peter',
        },
      },
    ]);
  });
});
