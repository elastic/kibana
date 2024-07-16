/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesGetResponse, IndicesStatsResponse } from '@elastic/elasticsearch/lib/api/types';

export const MOCK_GET_INDICES_RESPONSES: Record<string, IndicesGetResponse> = {
  regular: {
    'unit-test-index': {
      aliases: {},
      settings: {},
    },
  },
  withAlias: {
    'unit-test-index': {
      aliases: {
        'test-alias': {},
      },
      settings: {},
    },
  },
  withHiddenAlias: {
    'unit-test-index': {
      aliases: {
        'test-alias': {
          is_hidden: true,
        },
      },
      settings: {},
    },
  },
  hiddenIndex: {
    'test-hidden': {
      aliases: {},
      settings: {
        index: {
          hidden: true,
        },
      },
    },
  },
  closedIndex: {
    'test-hidden': {
      aliases: {},
      settings: {
        index: {
          verified_before_close: true,
        },
      },
    },
  },
  manyResults: {
    'unit-test-index-001': {
      aliases: {},
      settings: {},
    },
    'unit-test-index-002': {
      aliases: {},
      settings: {},
    },
    'unit-test-index-003': {
      aliases: {},
      settings: {},
    },
    'unit-test-index-004': {
      aliases: {},
      settings: {},
    },
    'unit-test-index-005': {
      aliases: {},
      settings: {},
    },
    'unit-test-index-006': {
      aliases: {},
      settings: {},
    },
    'unit-test-index-007': {
      aliases: {},
      settings: {},
    },
    'unit-test-index-008': {
      aliases: {},
      settings: {},
    },
    'unit-test-index-009': {
      aliases: {},
      settings: {},
    },
  },
};
export const MOCK_INDICES_STATS_RESPONSES: Record<string, IndicesStatsResponse> = {
  regular: {
    _shards: {
      total: 1,
      successful: 1,
      failed: 0,
    },
    _all: {},
    indices: {
      'unit-test-index': {
        health: 'green',
        status: 'open',
        total: {
          docs: {
            count: 100,
            deleted: 0,
          },
          store: {
            reserved_in_bytes: 0,
            size_in_bytes: 108000,
          },
        },
        uuid: '83a81e7e-5955-4255-b008-5d6961203f57',
      },
    },
  },
  manyResults: {
    _shards: {
      total: 1,
      successful: 1,
      failed: 0,
    },
    _all: {},
    indices: {
      'unit-test-index-001': {
        health: 'green',
        status: 'open',
        total: {
          docs: {
            count: 100,
            deleted: 0,
          },
          store: {
            reserved_in_bytes: 0,
            size_in_bytes: 108000,
          },
        },
      },
      'unit-test-index-002': {
        health: 'yellow',
        status: 'open',
        total: {
          docs: {
            count: 100,
            deleted: 0,
          },
          store: {
            reserved_in_bytes: 0,
            size_in_bytes: 108000,
          },
        },
      },
      'unit-test-index-003': {
        health: 'green',
        status: 'open',
        total: {
          docs: {
            count: 100,
            deleted: 0,
          },
          store: {
            reserved_in_bytes: 0,
            size_in_bytes: 108000,
          },
        },
      },
      'unit-test-index-004': {
        health: 'green',
        status: 'open',
        total: {
          docs: {
            count: 100,
            deleted: 0,
          },
          store: {
            reserved_in_bytes: 0,
            size_in_bytes: 108000,
          },
        },
      },
      'unit-test-index-005': {
        health: 'RED',
        status: 'open',
        total: {
          docs: {
            count: 100,
            deleted: 0,
          },
          store: {
            reserved_in_bytes: 0,
            size_in_bytes: 108000,
          },
        },
      },
    },
  },
};
