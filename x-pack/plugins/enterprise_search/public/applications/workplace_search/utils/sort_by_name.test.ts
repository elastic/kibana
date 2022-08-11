/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortByName } from './sort_by_name';

describe('sortByName', () => {
  it('should sort by name', () => {
    const unsorted = [
      {
        name: 'aba',
      },
      {
        name: 'aaa',
      },
      {
        name: 'constant',
      },
      {
        name: 'beta',
      },
    ];
    const sorted = [
      {
        name: 'aaa',
      },
      {
        name: 'aba',
      },
      {
        name: 'beta',
      },
      {
        name: 'constant',
      },
    ];
    expect(sortByName(unsorted)).toEqual(sorted);
  });
});
