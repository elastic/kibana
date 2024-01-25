/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { UpdateConversationSchema, updateConversation } from './update_conversation';
import { getConversation } from './get_conversation';
import {
  ConversationResponse,
  ConversationUpdateProps,
} from '../schemas/conversations/common_attributes.gen';

export const getUpdateConversationOptionsMock = (): ConversationUpdateProps => ({
  id: 'test',
  title: 'test',
  apiConfig: {
    connectorId: '1',
    connectorTypeTitle: 'test-connector',
    defaultSystemPromptId: 'default-system-prompt',
    model: 'test-model',
    provider: 'OpenAI',
  },
  excludeFromLastConversationStorage: false,
  messages: [],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replacements: {} as any,
});

export const getConversationResponseMock = (): ConversationResponse => ({
  id: 'test',
  title: 'test',
  apiConfig: {
    connectorId: '1',
    connectorTypeTitle: 'test-connector',
    defaultSystemPromptId: 'default-system-prompt',
    model: 'test-model',
    provider: 'OpenAI',
  },
  excludeFromLastConversationStorage: false,
  messages: [],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replacements: {} as any,
});

jest.mock('./get_conversation', () => ({
  getConversation: jest.fn(),
}));

describe('updateConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a conversation with serializer and deserializer', async () => {
    const conversation: UpdateConversationSchema = {
      ...getConversationResponseMock(),
      title: 'test',
      '@timestamp': Date.now().toLocaleString(),
    };
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce(conversation);
    const options = getUpdateConversationOptionsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.updateByQuery.mockResolvedValue({ updated: 1 });
    const updatedList = await updateConversation(
      esClient,
      jest.fn(),
      'index-1',
      options,
      conversation
    );
    const expected: UpdateConversationSchema = {
      ...getConversationResponseMock(),
      id: conversation.id,
      title: 'test',
    };
    expect(updatedList).toEqual(expected);
  });

  test('it returns null when there is not a conversation to update', async () => {
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce(null);
    const options = getUpdateConversationOptionsMock();
    const updatedList = await updateConversation(options);
    expect(updatedList).toEqual(null);
  });

  test('throw error if no conversation was updated', async () => {
    const conversation: UpdateConversationSchema = {
      ...getConversationResponseMock(),
      title: 'test',
    };
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce(conversation);
    const options = getUpdateConversationOptionsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.updateByQuery.mockResolvedValue({ updated: 0 });
    await expect(updateConversation({ ...options, esClient })).rejects.toThrow(
      'No conversation has been updated'
    );
  });
});
