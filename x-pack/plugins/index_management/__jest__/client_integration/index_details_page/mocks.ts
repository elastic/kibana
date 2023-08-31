/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Index } from '../../../public';

export const testIndexName = 'test_index';
export const testIndexMock: Index = {
  health: 'green',
  status: 'open',
  name: testIndexName,
  uuid: 'test1234',
  primary: '1',
  replica: '1',
  documents: 1,
  documents_deleted: 0,
  size: '10kb',
  primary_size: '10kb',
  isFrozen: false,
  aliases: 'none',
  hidden: false,
  isRollupIndex: false,
  ilm: {
    index: 'test_index',
    managed: false,
  },
  isFollowerIndex: false,
};

export const testIndexMappings = {
  mappings: {
    dynamic: 'false',
    dynamic_templates: [],
    properties: {
      '@timestamp': {
        type: 'date',
      },
    },
  },
};

// Mocking partial index stats response
export const testIndexStats = {
  _shards: {
    total: 1,
    successful: 1,
    failed: 0,
  },
  stats: {
    uuid: 'tQ-n6sriQzC84xn58VYONQ',
    health: 'green',
    status: 'open',
    primaries: {
      docs: {
        count: 1000,
        deleted: 0,
      },
    },
    total: {
      docs: {
        count: 1000,
        deleted: 0,
      },
    },
  },
};
