/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteDocument } from './documents';
import { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

describe('deleteDocument', () => {
  let mockClient: jest.Mocked<ElasticsearchClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockClient = {
      delete: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<ElasticsearchClient>;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      log: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
  });

  it('should delete a document and return true', async () => {
    const index = 'test-index';
    const id = 'test-id';

    const result = await deleteDocument(mockClient, mockLogger, index, id);

    expect(mockClient.delete).toHaveBeenCalledWith({
      index,
      id,
    });
    expect(result).toBe(true);
  });

  it('should log an error and throw when delete fails', async () => {
    const index = 'test-index';
    const id = 'test-id';
    const error = new Error('Delete failed');

    mockClient.delete.mockRejectedValue(error);

    await expect(deleteDocument(mockClient, mockLogger, index, id)).rejects.toThrow(
      'Delete failed'
    );
  });
});
