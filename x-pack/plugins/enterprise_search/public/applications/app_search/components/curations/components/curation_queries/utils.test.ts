/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterEmptyQueries } from './utils';

describe('filterEmptyQueries', () => {
  it('filters out all empty strings from a queries array', () => {
    const queries = ['', 'a', '', 'b', '', 'c', ''];
    expect(filterEmptyQueries(queries)).toEqual(['a', 'b', 'c']);
  });
});
