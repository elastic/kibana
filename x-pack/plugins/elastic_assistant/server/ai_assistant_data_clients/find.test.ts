/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { estypes } from '@elastic/elasticsearch';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { findDocuments } from './find';
import { SearchEsConversationSchema } from './conversations/types';

export const getSearchConversationMock =
  (): estypes.SearchResponse<SearchEsConversationSchema> => ({
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

describe('findDocuments', () => {
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
    const conversation = await findDocuments({
      esClient,
      index: '.kibana-elastic-ai-assistant-conversations',
      page: 1,
      perPage: 10,
      logger: loggerMock,
    });
    expect(conversation).toEqual({
      data: {
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
                api_config: {
                  connector_id: 'c1',
                  default_system_prompt_id: 'prompt-1',
                  model: 'test',
                  provider: 'Azure OpenAI',
                },
                category: 'assistant',
                created_at: '2020-04-20T15:25:31.830Z',
                exclude_from_last_conversation_storage: false,
                id: '1',
                is_default: true,
                messages: [],
                namespace: 'default',
                replacements: undefined,
                summary: {
                  content: 'test',
                },
                title: 'title-1',
                updated_at: '2020-04-20T15:25:31.830Z',
                users: [
                  {
                    id: '1111',
                    name: 'elastic',
                  },
                ],
              },
            },
          ],
          max_score: 0,
          total: 1,
        },
        timed_out: false,
        took: 10,
      },
      page: 1,
      perPage: 10,
      total: 1,
    });
  });

  test('it returns empty data array if the search is empty', async () => {
    const data = getSearchConversationMock();
    data.hits.hits = [];
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse(data);
    const conversations = await findDocuments({
      esClient,
      index: '.kibana-elastic-ai-assistant-conversations',
      page: 1,
      perPage: 10,
      logger: loggerMock,
    });
    expect(conversations.data).toEqual({
      _scroll_id: '123',
      _shards: { failed: 0, skipped: 0, successful: 0, total: 0 },
      hits: { hits: [], max_score: 0, total: 1 },
      timed_out: false,
      took: 10,
    });
  });

  test('throw error if ES client get fails', async () => {
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockRejectedValueOnce(new Error('Request has been aborted by the user'));
    await expect(
      findDocuments({
        esClient,
        index: '.kibana-elastic-ai-assistant-conversations',
        page: 1,
        perPage: 10,
        logger: loggerMock,
      })
    ).rejects.toThrow('Request has been aborted by the user');
  });
});
