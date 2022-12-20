/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGroupFilter } from './get_group_filter';

const changePointGroups = [
  {
    id: '2038579476',
    group: [
      { fieldName: 'response_code', fieldValue: '500', duplicate: false },
      { fieldName: 'url', fieldValue: 'home.php', duplicate: false },
      { fieldName: 'url', fieldValue: 'login.php', duplicate: false },
    ],
    docCount: 792,
    pValue: 0.010770456205312423,
  },
  {
    id: '817080373',
    group: [{ fieldName: 'user', fieldValue: 'Peter', duplicate: false }],
    docCount: 1981,
    pValue: 2.7454255728359757e-21,
  },
];

describe('getGroupFilter', () => {
  it('gets a query filter for the change points of a group with multiple values per field', () => {
    expect(getGroupFilter(changePointGroups[0])).toStrictEqual([
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
    expect(getGroupFilter(changePointGroups[1])).toStrictEqual([
      {
        term: {
          user: 'Peter',
        },
      },
    ]);
  });
});
