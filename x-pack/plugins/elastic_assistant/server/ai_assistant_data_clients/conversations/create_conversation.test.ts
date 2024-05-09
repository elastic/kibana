/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { createConversation } from './create_conversation';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { estypes } from '@elastic/elasticsearch';
import { EsConversationSchema } from './types';
import { getConversation } from './get_conversation';
import { ConversationCreateProps, ConversationResponse } from '@kbn/elastic-assistant-common';
import { AuthenticatedUser } from '@kbn/security-plugin-types-common';

jest.mock('./get_conversation', () => ({
  getConversation: jest.fn(),
}));

const mockUser1 = {
  username: 'my_username',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;

export const getCreateConversationMock = (): ConversationCreateProps => ({
  title: 'test',
  apiConfig: {
    actionTypeId: '.gen-ai',
    connectorId: '1',
    defaultSystemPromptId: 'default-system-prompt',
    model: 'test-model',
    provider: 'OpenAI',
  },
  excludeFromLastConversationStorage: false,
  isDefault: false,
  messages: [],
  replacements: {},
  category: 'assistant',
});

export const getConversationResponseMock = (): ConversationResponse => ({
  id: 'test',
  title: 'test',
  apiConfig: {
    actionTypeId: '.gen-ai',
    connectorId: '1',
    defaultSystemPromptId: 'default-system-prompt',
    model: 'test-model',
    provider: 'OpenAI',
  },
  excludeFromLastConversationStorage: false,
  messages: [],
  replacements: {},
  createdAt: '2024-01-28T04:20:02.394Z',
  namespace: 'test',
  isDefault: false,
  updatedAt: '2024-01-28T04:20:02.394Z',
  timestamp: '2024-01-28T04:20:02.394Z',
  category: 'assistant',
  users: [
    {
      name: 'test',
    },
  ],
});

export const getSearchConversationMock = (): estypes.SearchResponse<EsConversationSchema> => ({
  _scroll_id: '123',
  _shards: {
    failed: 0,
    skipped: 0,
    successful: 0,
    total: 0,
  },
  hits: {
    hits: [
      {
        _id: '1',
        _index: '',
        _score: 0,
        _source: {
          '@timestamp': '2020-04-20T15:25:31.830Z',
          created_at: '2020-04-20T15:25:31.830Z',
          title: 'title-1',
          updated_at: '2020-04-20T15:25:31.830Z',
          messages: [],
          category: 'assistant',
          id: '1',
          namespace: 'default',
          is_default: true,
          exclude_from_last_conversation_storage: false,
          api_config: {
            action_type_id: '.gen-ai',
            connector_id: 'c1',
            default_system_prompt_id: 'prompt-1',
            model: 'test',
            provider: 'Azure OpenAI',
          },
          users: [
            {
              id: '1111',
              name: 'elastic',
            },
          ],
          replacements: undefined,
        },
      },
    ],
    max_score: 0,
    total: 1,
  },
  timed_out: false,
  took: 10,
});

describe('createConversation', () => {
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

  test('it returns a conversation as expected with the id changed out for the elastic id', async () => {
    const conversation = getCreateConversationMock();
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce({
      ...getConversationResponseMock(),
      id: 'elastic-id-123',
    });

    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.create.mockResponse(
      // @ts-expect-error not full response interface
      { _id: 'elastic-id-123' }
    );
    const createdConversation = await createConversation({
      esClient,
      conversationIndex: 'index-1',
      spaceId: 'test',
      user: mockUser1,
      conversation,
      logger,
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
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce({
      ...getConversationResponseMock(),
      id: 'elastic-id-123',
      title: 'test new title',
    });

    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.create.mockResponse(
      // @ts-expect-error not full response interface
      { _id: 'elastic-id-123' }
    );
    const createdConversation = await createConversation({
      esClient,
      conversationIndex: 'index-1',
      spaceId: 'test',
      user: mockUser1,
      conversation,
      logger,
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
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce(getConversationResponseMock());

    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    await createConversation({
      esClient,
      conversationIndex: 'index-1',
      spaceId: 'test',
      user: mockUser1,
      conversation,
      logger,
    });

    expect(esClient.create).toBeCalled();
  });

  test('It returns an auto-generated id if id is sent in undefined', async () => {
    const conversation = getCreateConversationMock();
    (getConversation as unknown as jest.Mock).mockResolvedValueOnce({
      ...getConversationResponseMock(),
      id: 'elastic-id-123',
    });

    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.create.mockResponse(
      // @ts-expect-error not full response interface
      { _id: 'elastic-id-123' }
    );
    const createdConversation = await createConversation({
      esClient,
      conversationIndex: 'index-1',
      spaceId: 'test',
      user: mockUser1,
      conversation,
      logger,
    });

    const expected: ConversationResponse = {
      ...getConversationResponseMock(),
      id: 'elastic-id-123',
    };
    expect(createdConversation).toEqual(expected);
  });
});
