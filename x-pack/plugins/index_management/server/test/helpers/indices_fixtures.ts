/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesIndexState, IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';
import { Index } from '../..';

// fixtures return minimal index properties needed for API tests

export const createTestIndexState = (index?: Partial<IndicesIndexState>) => {
  return {
    aliases: {},
    settings: { index: { number_of_shards: 1, number_of_replicas: 1 } },
    ...index,
  };
};

export const createTestIndexStats = (index?: Partial<IndicesStatsIndicesStats>) => {
  return {
    health: 'green',
    status: 'open',
    uuid: 'test_index',
    total: { docs: { count: 1, deleted: 0 }, store: { size_in_bytes: 100 } },
    primaries: { store: { size_in_bytes: 100 } },
    ...index,
  };
};

export const createTestIndexResponse = (index?: Partial<Index>) => {
  return {
    aliases: 'none',
    data_stream: undefined,
    documents: 1,
    documents_deleted: 0,
    health: 'green',
    hidden: false,
    isFrozen: false,
    name: 'test_index',
    primary: 1,
    replica: 1,
    size: '100b',
    primary_size: '100b',
    status: 'open',
    uuid: 'test_index',
    ...index,
  };
};
