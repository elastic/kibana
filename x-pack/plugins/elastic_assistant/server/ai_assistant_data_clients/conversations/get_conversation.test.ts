/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { getConversation } from './get_conversation';
import { estypes } from '@elastic/elasticsearch';
import { EsConversationSchema } from './types';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ConversationResponse } from '@kbn/elastic-assistant-common';
import { AuthenticatedUser } from '@kbn/security-plugin-types-common';

export const getConversationResponseMock = (): ConversationResponse => ({
  createdAt: '2020-04-20T15:25:31.830Z',
  title: 'title-1',
  updatedAt: '2020-04-20T15:25:31.830Z',
  messages: [],
  id: '1',
  namespace: 'default',
  isDefault: true,
  excludeFromLastConversationStorage: false,
  timestamp: '2020-04-20T15:25:31.830Z',
  apiConfig: {
    actionTypeId: '.gen-ai',
    connectorId: 'c1',
    defaultSystemPromptId: 'prompt-1',
    model: 'test',
    provider: 'Azure OpenAI',
  },
  summary: {
    content: 'test',
  },
  category: 'assistant',
  users: [
    {
      id: '1111',
      name: 'elastic',
    },
  ],
  replacements: undefined,
});

const mockUser1 = {
  username: 'my_username',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;

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
          summary: {
            content: 'test',
          },
          category: 'assistant',
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

describe('getConversation', () => {
  let loggerMock: Logger;
  beforeEach(() => {
    jest.clearAllMocks();
    loggerMock = loggingSystemMock.createLogger();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a conversation as expected if the conversation is found', async () => {
    const data = getSearchConversationMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse(data);
    const conversation = await getConversation({
      esClient,
      conversationIndex: '.kibana-elastic-ai-assistant-conversations',
      id: '1',
      logger: loggerMock,
      user: mockUser1,
    });
    const expected = getConversationResponseMock();
    expect(conversation).toEqual(expected);
  });

  test('it returns null if the search is empty', async () => {
    const data = getSearchConversationMock();
    data.hits.hits = [];
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse(data);
    const conversation = await getConversation({
      esClient,
      conversationIndex: '.kibana-elastic-ai-assistant-conversations',
      id: '1',
      logger: loggerMock,
      user: mockUser1,
    });
    expect(conversation).toEqual(null);
  });
});
