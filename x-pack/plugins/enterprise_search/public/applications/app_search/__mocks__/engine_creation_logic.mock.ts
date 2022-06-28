/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchIndexSelectableOption } from '../components/engine_creation/search_index_selectable';

export const DEFAULT_VALUES = {
  ingestionMethod: '',
  isLoading: false,
  name: '',
  rawName: '',
  language: 'Universal',
  isLoadingIndices: false,
  indices: [],
  indicesFormatted: [],
  selectedIndex: '',
  engineType: 'appSearch',
  isSubmitDisabled: true,
};

export const mockElasticsearchIndices = [
  {
    health: 'yellow',
    status: 'open',
    name: 'search-my-index-1',
    uuid: 'ydlR_QQJTeyZP66tzQSmMQ',
    total: {
      docs: {
        count: 0,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
  },
  {
    health: 'green',
    status: 'open',
    name: 'search-my-index-2',
    uuid: '4dlR_QQJTe2ZP6qtzQSmMQ',
    total: {
      docs: {
        count: 100,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
    aliases: ['search-index-123'],
  },
];

export const mockSearchIndexOptions: SearchIndexSelectableOption[] = [
  {
    label: 'search-my-index-1',
    health: 'yellow',
    status: 'open',
    total: {
      docs: {
        count: 0,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
  },
  {
    label: 'search-my-index-2',
    health: 'green',
    status: 'open',
    total: {
      docs: {
        count: 100,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
  },
];
