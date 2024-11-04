/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { createKnowledgeBaseEntry } from './create_knowledge_base_entry';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { getKnowledgeBaseEntry } from './get_knowledge_base_entry';
import { KnowledgeBaseEntryResponse } from '@kbn/elastic-assistant-common';
import {
  getKnowledgeBaseEntryMock,
  getCreateKnowledgeBaseEntrySchemaMock,
} from '../../__mocks__/knowledge_base_entry_schema.mock';
import type { AuthenticatedUser } from '@kbn/core-security-common';

jest.mock('./get_knowledge_base_entry', () => ({
  getKnowledgeBaseEntry: jest.fn(),
}));
export const mockUser = {
  username: 'my_username',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;
describe('createKnowledgeBaseEntry', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.useFakeTimers();
    const date = '2024-01-28T04:20:02.394Z';
    jest.setSystemTime(new Date(date));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('it creates a knowledge base entry with create schema', async () => {
    const knowledgeBaseEntry = getCreateKnowledgeBaseEntrySchemaMock();
    (getKnowledgeBaseEntry as unknown as jest.Mock).mockResolvedValueOnce({
      ...getKnowledgeBaseEntryMock(),
      id: 'elastic-id-123',
    });

    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.create.mockResponse(
      // @ts-expect-error not full response interface
      { _id: 'elastic-id-123' }
    );
    const createdEntry = await createKnowledgeBaseEntry({
      esClient,
      knowledgeBaseIndex: 'index-1',
      spaceId: 'test',
      user: mockUser,
      knowledgeBaseEntry,
      logger,
    });
    expect(esClient.create).toHaveBeenCalledWith({
      body: {
        '@timestamp': '2024-01-28T04:20:02.394Z',
        created_at: '2024-01-28T04:20:02.394Z',
        created_by: 'unknown',
        updated_at: '2024-01-28T04:20:02.394Z',
        updated_by: 'unknown',
        namespace: 'test',
        users: [{ id: undefined, name: 'my_username' }],
        type: 'document',
        semantic_text: 'test',
        source: 'test',
        text: 'test',
        name: 'test',
        kb_resource: 'test',
        required: false,
        vector: undefined,
      },
      id: expect.any(String),
      index: 'index-1',
      refresh: 'wait_for',
    });

    const expected: KnowledgeBaseEntryResponse = {
      ...getKnowledgeBaseEntryMock(),
      id: 'elastic-id-123',
    };

    expect(createdEntry).toEqual(expected);
  });

  test('it throws an error when creating a knowledge base entry fails', async () => {
    const knowledgeBaseEntry = getCreateKnowledgeBaseEntrySchemaMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.create.mockRejectedValue(new Error('Test error'));
    await expect(
      createKnowledgeBaseEntry({
        esClient,
        knowledgeBaseIndex: 'index-1',
        spaceId: 'test',
        user: mockUser,
        knowledgeBaseEntry,
        logger,
      })
    ).rejects.toThrowError('Test error');
  });
});
