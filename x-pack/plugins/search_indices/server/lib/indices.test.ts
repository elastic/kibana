/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';

import { createIndex } from './indices';

const mockLogger = {
  warn: jest.fn(),
  error: jest.fn(),
};
const logger: Logger = mockLogger as unknown as Logger;

const mockClient = {
  indices: {
    create: jest.fn(),
  },
};
const client = mockClient as unknown as ElasticsearchClient;

describe('indices lib', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createIndex', () => {
    it('should create index with req', async () => {
      mockClient.indices.create.mockResolvedValue({});

      await expect(createIndex(client, logger, { indexName: 'test-index' })).resolves.toEqual({
        index: 'test-index',
      });

      expect(mockClient.indices.create).toHaveBeenCalledTimes(1);
      expect(mockClient.indices.create).toHaveBeenCalledWith({ index: 'test-index' });
    });

    it('should raise errors from client', async () => {
      const error = new Error('Boom!!');
      mockClient.indices.create.mockRejectedValue(error);

      await expect(createIndex(client, logger, { indexName: 'test-index' })).rejects.toEqual(error);
    });
  });
});
