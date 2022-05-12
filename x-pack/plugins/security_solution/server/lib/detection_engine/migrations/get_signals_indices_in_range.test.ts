/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getSignalsIndicesInRange } from './get_signals_indices_in_range';

describe('getSignalsIndicesInRange', () => {
  let esClient: ElasticsearchClient;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('returns empty array if provided index is empty', async () => {
    const indicesInRange = await getSignalsIndicesInRange({ esClient, index: [], from: 'now-3d' });
    expect(indicesInRange).toEqual([]);
  });
});
