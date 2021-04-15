/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterEmptyValues } from './utils';

describe('filterEmptyValues', () => {
  it('filters out all empty strings from the array', () => {
    const values = ['', 'a', '', 'b', '', 'c', ''];
    expect(filterEmptyValues(values)).toEqual(['a', 'b', 'c']);
  });
});
