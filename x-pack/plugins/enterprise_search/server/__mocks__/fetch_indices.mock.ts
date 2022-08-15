/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockSingleIndexResponse = {
  'search-regular-index': {
    aliases: {},
  },
};

export const mockSingleIndexStatsResponse = {
  indices: {
    'search-regular-index': {
      health: 'green',
      status: 'open',
      total: {
        docs: {
          count: 100,
          deleted: 0,
        },
        store: {
          size_in_bytes: 108000,
        },
      },
      uuid: '83a81e7e-5955-4255-b008-5d6961203f57',
    },
  },
};

export const mockMultiIndexResponse = {
  'hidden-index': {
    aliases: {
      'alias-hidden-index': {},
      'search-alias-hidden-index': {},
    },
    settings: { index: { hidden: 'true' } },
  },
  'regular-index': {
    aliases: {
      'alias-regular-index': {},
      'search-alias-regular-index': {},
    },
  },
  'search-prefixed-hidden-index': {
    aliases: {
      'alias-search-prefixed-hidden-index': {},
      'search-alias-search-prefixed-hidden-index': {},
    },
    settings: { index: { hidden: 'true' } },
  },
  'search-prefixed-regular-index': {
    aliases: {
      'alias-search-prefixed-regular-index': {},
      'search-alias-search-prefixed-regular-index': {},
    },
  },
};

export const mockMultiStatsResponse: {
  indices: Record<string, { total: object; [k: string]: unknown }>;
} = {
  indices: {
    'alias-hidden-index': {
      ...mockSingleIndexStatsResponse.indices['search-regular-index'],
    },
    'alias-regular-index': {
      ...mockSingleIndexStatsResponse.indices['search-regular-index'],
    },
    'alias-search-prefixed-hidden-index': {
      ...mockSingleIndexStatsResponse.indices['search-regular-index'],
    },
    'alias-search-prefixed-regular-index': {
      ...mockSingleIndexStatsResponse.indices['search-regular-index'],
    },
    'hidden-index': {
      ...mockSingleIndexStatsResponse.indices['search-regular-index'],
    },
    'regular-index': {
      ...mockSingleIndexStatsResponse.indices['search-regular-index'],
    },
    'search-alias-hidden-index': {
      ...mockSingleIndexStatsResponse.indices['search-regular-index'],
    },
    'search-alias-regular-index': {
      ...mockSingleIndexStatsResponse.indices['search-regular-index'],
    },
    'search-alias-search-prefixed-hidden-index': {
      ...mockSingleIndexStatsResponse.indices['search-regular-index'],
    },
    'search-alias-search-prefixed-regular-index': {
      ...mockSingleIndexStatsResponse.indices['search-regular-index'],
    },
    'search-prefixed-hidden-index': {
      ...mockSingleIndexStatsResponse.indices['search-regular-index'],
    },
    'search-prefixed-regular-index': {
      ...mockSingleIndexStatsResponse.indices['search-regular-index'],
    },
  },
};

export const mockPrivilegesResponse = Object.keys(mockMultiStatsResponse.indices).reduce<
  Record<string, unknown>
>((acc, key) => {
  acc[key] = { manage: true, read: true };
  return acc;
}, {});

export const getIndexReturnValue = (indexName: string) => {
  return {
    ...mockMultiStatsResponse.indices[indexName],
    alias: indexName.startsWith('alias') || indexName.startsWith('search-alias'),
    count: 100,
    name: indexName,
    privileges: { manage: true, read: true },
    total: {
      ...mockMultiStatsResponse.indices[indexName].total,
      store: {
        size_in_bytes: '105.47kb',
      },
    },
  };
};
