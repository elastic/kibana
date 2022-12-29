/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stubIndexPattern } from 'src/plugins/data/common/stubs';
import { getSort } from './get_sort';

const createMockIndexPattern = () => stubIndexPattern;

describe('get_sort', () => {
  it('gets the sort for @timestamp', () => {
    const sortPair: [string, string] = ['sortField', 'desc'];
    const mockIndexPattern = createMockIndexPattern();
    const result = getSort(sortPair, mockIndexPattern);
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "sortField": "desc",
        },
      ]
    `);
  });
});
