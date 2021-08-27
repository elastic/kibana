/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIndicesFromPrefix } from './create_indices_from_prefix';

/** Get the return type of createIndicesFromPrefix for TypeScript checks against expected */
type ReturnTypeCreateIndicesFromPrefix = ReturnType<typeof createIndicesFromPrefix>;

describe('create_indices_from_prefix', () => {
  test('returns empty array given an empty array', () => {
    expect(
      createIndicesFromPrefix({
        transformIndices: [],
        prefix: 'prefix',
      })
    ).toEqual<ReturnTypeCreateIndicesFromPrefix>([]);
  });

  test('returns expected prefix given a set of indices', () => {
    expect(
      createIndicesFromPrefix({
        transformIndices: ['index_1', 'index_2'],
        prefix: 'prefix',
      })
    ).toEqual<ReturnTypeCreateIndicesFromPrefix>(['.estc_prefix_index_1', '.estc_prefix_index_2']);
  });
});
