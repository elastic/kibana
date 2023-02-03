/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { fetchMappings } from './fetch_mappings';

describe('fetchMappings()', () => {
  const mockClient = {
    indices: { getMapping: jest.fn() },
  } as unknown as jest.Mocked<ElasticsearchClient>;

  it('should call getMapping() method on elasticsearch client', async () => {
    await fetchMappings(mockClient, []);

    expect(mockClient.indices.getMapping).toHaveBeenCalled();
  });
});
