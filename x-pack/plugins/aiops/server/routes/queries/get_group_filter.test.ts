/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { finalSignificantTermGroups } from '../../../common/__mocks__/artificial_logs/final_significant_term_groups';

import { getGroupFilter } from './get_group_filter';

describe('getGroupFilter', () => {
  it('gets a query filter for the significant terms of a group', () => {
    expect(getGroupFilter(finalSignificantTermGroups[0])).toStrictEqual([
      {
        term: {
          url: 'login.php',
        },
      },
      {
        term: {
          user: 'Peter',
        },
      },
    ]);
  });
});
