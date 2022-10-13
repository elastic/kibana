/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
