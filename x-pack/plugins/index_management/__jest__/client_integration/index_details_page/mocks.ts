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
  replica: '2',
  documents: 1,
  documents_deleted: 0,
  size: '20kb',
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

export const testIndexMappingsWithSemanticText = {
  mappings: {
    dynamic: 'false',
    dynamic_templates: [],
    properties: {
      '@timestamp': {
        type: 'date',
      },
      semantic_text: {
        type: 'semantic_text',
        inference_id: 'inference_id',
      },
    },
  },
};

// Mocking partial index settings response
export const testIndexSettings = {
  settings: {
    index: {
      routing: {
        allocation: {
          include: {
            _tier_preference: 'data_content',
          },
        },
      },
      number_of_shards: '1',
    },
  },
  defaults: {
    index: {
      flush_after_merge: '512mb',
      max_script_fields: '32',
      query: {
        default_field: ['*'],
      },
      priority: '1',
    },
  },
};
export const testIndexEditableSettingsAll = {
  'index.priority': '1',
  'index.query.default_field': ['*'],
  'index.routing.allocation.include._tier_preference': 'data_content',
};
export const testIndexEditableSettingsLimited = {
  'index.query.default_field': ['*'],
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

export const testSystemIndexName = 'test_index';
export const testSystemIndexMock: Index = {
  health: 'green',
  status: 'open',
  name: testSystemIndexName,
  uuid: 'test1234',
  primary: '1',
  replica: '2',
  documents: 1,
  documents_deleted: 0,
  size: '20kb',
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
