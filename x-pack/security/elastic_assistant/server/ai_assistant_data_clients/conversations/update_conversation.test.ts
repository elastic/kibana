/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { updateConversation } from './update_conversation';
import { getConversation } from './get_conversation';
import { ConversationResponse, ConversationUpdateProps } from '@kbn/elastic-assistant-common';
import { AuthenticatedUser } from '@kbn/security-plugin-types-common';

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
  replacements: [],
});

const mockUser1 = {
  username: 'my_username',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;

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
  category: 'assistant',
  excludeFromLastConversationStorage: false,
  messages: [],
  replacements: [],
  createdAt: '2020-04-20T15:25:31.830Z',
  namespace: 'default',
  isDefault: false,
  updatedAt: '2020-04-20T15:25:31.830Z',
  timestamp: '2020-04-20T15:25:31.830Z',
  users: [
    {
      id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
      name: 'elastic',
    },
  ],
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
    const conversation: ConversationUpdateProps = getUpdateConversationOptionsMock();
    const existingConversation = getConversationResponseMock();
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce(existingConversation);

    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.updateByQuery.mockResolvedValue({ updated: 1 });

    const updatedList = await updateConversation({
      esClient,
      logger: loggerMock.create(),
      conversationIndex: 'index-1',
      conversationUpdateProps: conversation,
      user: mockUser1,
    });
    const expected: ConversationResponse = {
      ...getConversationResponseMock(),
      id: conversation.id,
      title: 'test',
    };
    expect(updatedList).toEqual(expected);
  });

  test('it returns null when there is not a conversation to update', async () => {
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce(null);
    const conversation = getUpdateConversationOptionsMock();

    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    const updatedList = await updateConversation({
      esClient,
      logger: loggerMock.create(),
      conversationIndex: 'index-1',
      conversationUpdateProps: conversation,
      user: mockUser1,
    });
    expect(updatedList).toEqual(null);
  });
});
