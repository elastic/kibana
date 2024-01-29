/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { createConversation } from './create_conversation';
import {
  ConversationCreateProps,
  ConversationResponse,
} from '../schemas/conversations/common_attributes.gen';

export const getCreateConversationMock = (): ConversationCreateProps => ({
  title: 'test',
  apiConfig: {
    connectorId: '1',
    connectorTypeTitle: 'test-connector',
    defaultSystemPromptId: 'default-system-prompt',
    model: 'test-model',
    provider: 'OpenAI',
  },
  excludeFromLastConversationStorage: false,
  isDefault: false,
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
  createdAt: '2024-01-28T04:20:02.394Z',
  namespace: 'test',
  isDefault: false,
  updatedAt: '2024-01-28T04:20:02.394Z',
  timestamp: '2024-01-28T04:20:02.394Z',
  user: {
    name: 'test',
  },
});

describe('createConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  test('it returns a conversation as expected with the id changed out for the elastic id', async () => {
    const conversation = getCreateConversationMock();

    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.create.mockResponse(
      // @ts-expect-error not full response interface
      { _id: 'elastic-id-123' }
    );
    const createdConversation = await createConversation({
      esClient,
      conversationIndex: 'index-1',
      spaceId: 'test',
      user: { name: 'test' },
      conversation,
    });

    const expected: ConversationResponse = {
      ...getConversationResponseMock(),
      id: 'elastic-id-123',
    };

    expect(createdConversation).toEqual(expected);
  });

  test('it returns a conversation as expected with the id changed out for the elastic id and title set', async () => {
    const conversation: ConversationCreateProps = {
      ...getCreateConversationMock(),
      title: 'test new title',
    };
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.create.mockResponse(
      // @ts-expect-error not full response interface
      { _id: 'elastic-id-123' }
    );
    const createdConversation = await createConversation({
      esClient,
      conversationIndex: 'index-1',
      spaceId: 'test',
      user: { name: 'test' },
      conversation,
    });

    const expected: ConversationResponse = {
      ...getConversationResponseMock(),
      id: 'elastic-id-123',
      title: 'test new title',
    };
    expect(createdConversation).toEqual(expected);
  });

  test('It calls "esClient" with body, id, and conversationIndex', async () => {
    const conversation = getCreateConversationMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    await createConversation({
      esClient,
      conversationIndex: 'index-1',
      spaceId: 'test',
      user: { name: 'test' },
      conversation,
    });

    expect(esClient.create).toBeCalled();
  });

  test('It returns an auto-generated id if id is sent in undefined', async () => {
    const conversation = getCreateConversationMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.create.mockResponse(
      // @ts-expect-error not full response interface
      { _id: 'elastic-id-123' }
    );
    const createdConversation = await createConversation({
      esClient,
      conversationIndex: 'index-1',
      spaceId: 'test',
      user: { name: 'test' },
      conversation,
    });

    const expected: ConversationResponse = {
      ...getConversationResponseMock(),
      id: 'elastic-id-123',
    };
    expect(createdConversation).toEqual(expected);
  });
});
