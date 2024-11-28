/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnrichPolicyType } from '@elastic/elasticsearch/lib/api/types';

export const indexSettings = {
  settings: { index: { number_of_shards: '1' } },
  defaults: { index: { flush_after_merge: '512mb' } },
};

export const indexMappings = {
  mappings: {
    dynamic: 'strict',
    properties: {
      '@timestamp': {
        type: 'date',
      },
    },
  },
};

export const indexStats = {
  _shards: {
    total: 1,
    successful: 1,
    failed: 0,
  },
  stats: {
    uuid: 'test-uuid',
    health: 'green',
    status: 'open',
    primaries: {
      docs: {
        count: 0,
        deleted: 0,
      },
    },
    total: {
      docs: {
        count: 0,
        deleted: 0,
      },
    },
  },
};

export const createTestEnrichPolicy = (name: string, type: EnrichPolicyType) => ({
  name,
  type,
  sourceIndices: ['users'],
  matchField: 'email',
  enrichFields: ['first_name', 'last_name', 'city'],
  query: {
    match_all: {},
  },
});

export const getMatchingIndices = () => ({
  indices: ['test-1', 'test-2', 'test-3', 'test-4', 'test-5'],
});
export const getMatchingDataStreams = () => ({
  dataStreams: ['test-6', 'test-7', 'test-8', 'test-9', 'test-10'],
});

export const getFieldsFromIndices = () => ({
  commonFields: [],
  indices: [
    {
      index: 'test-1',
      fields: [
        { name: 'first_name', type: 'keyword', normalizedType: 'keyword' },
        { name: 'age', type: 'long', normalizedType: 'number' },
      ],
    },
  ],
});
