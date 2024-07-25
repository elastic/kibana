/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { UpdateByQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import { AIAssistantConversationsDataClient } from '.';
import { AuthenticatedUser } from '@kbn/core-security-common';
import { getUpdateConversationSchemaMock } from '../../__mocks__/conversations_schema.mock';
import { AIAssistantDataClientParams } from '..';

const date = '2023-03-28T22:27:28.159Z';
let logger: ReturnType<(typeof loggingSystemMock)['createLogger']>;
const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

const mockUser1 = {
  username: 'my_username',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;

describe('AIAssistantConversationsDataClient', () => {
  let assistantConversationsDataClientParams: AIAssistantDataClientParams;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    assistantConversationsDataClientParams = {
      logger,
      elasticsearchClientPromise: Promise.resolve(clusterClient),
      spaceId: 'default',
      indexPatternsResourceName: '',
      currentUser: mockUser1,
      kibanaVersion: '8.8.0',
    };
  });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(date));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('should get by id the persistent conversation successfully', async () => {
    clusterClient.search.mockReturnValue({
      // @ts-ignore
      hits: {
        total: { value: 1 },
        hits: [
          {
            _source: {
              '@timestamp': '2024-01-25T01:32:37.649Z',
              updated_at: '2024-01-25T01:34:51.303Z',
              api_config: {
                connector_id: 'bedbf764-b991-4115-a9fc-1cfeaef21046',
                model: 'anthropic.claude-v2',
              },
              namespace: 'hghjghjghghjghg33',
              created_at: '2024-01-25T01:32:37.649Z',
              messages: [
                {
                  '@timestamp': '1/24/2024, 5:32:19 PM',
                  role: 'assistant',
                  reader: null,
                  is_error: null,
                  content:
                    'Go ahead and click the add connector button below to continue the conversation!',
                },
                {
                  '@timestamp': '1/24/2024, 5:32:37 PM',
                  role: 'assistant',
                  reader: null,
                  is_error: null,
                  content: 'Connector setup complete!',
                },
                {
                  '@timestamp': '1/24/2024, 5:34:50 PM',
                  role: 'assistant',
                  reader: null,
                  is_error: true,
                  content: 'An error occurred sending your message.',
                },
              ],
              title: 'Alert summary',
              is_default: true,
              users: [
                {
                  name: 'elastic',
                  id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
                },
              ],
            },
          },
        ],
      },
    });

    const assistantConversationsDataClient = new AIAssistantConversationsDataClient(
      assistantConversationsDataClientParams
    );
    const result = await assistantConversationsDataClient.getConversation({ id: '1' });

    expect(clusterClient.search).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      apiConfig: {
        connectorId: 'bedbf764-b991-4115-a9fc-1cfeaef21046',
        defaultSystemPromptId: undefined,
        model: 'anthropic.claude-v2',
        provider: undefined,
      },
      createdAt: '2024-01-25T01:32:37.649Z',
      excludeFromLastConversationStorage: undefined,
      id: undefined,
      isDefault: true,
      messages: [
        {
          content:
            'Go ahead and click the add connector button below to continue the conversation!',
          role: 'assistant',
          timestamp: '1/24/2024, 5:32:19 PM',
        },
        {
          content: 'Connector setup complete!',
          role: 'assistant',
          timestamp: '1/24/2024, 5:32:37 PM',
        },
        {
          content: 'An error occurred sending your message.',
          isError: true,
          role: 'assistant',
          timestamp: '1/24/2024, 5:34:50 PM',
        },
      ],
      namespace: 'hghjghjghghjghg33',
      replacements: undefined,
      timestamp: '2024-01-25T01:32:37.649Z',
      title: 'Alert summary',
      updatedAt: '2024-01-25T01:34:51.303Z',
      users: [
        {
          id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
          name: 'elastic',
        },
      ],
    });
  });

  test('should update conversation with new messages', async () => {
    const assistantConversationsDataClient = new AIAssistantConversationsDataClient(
      assistantConversationsDataClientParams
    );

    await assistantConversationsDataClient.updateConversation({
      conversationUpdateProps: getUpdateConversationSchemaMock(
        '04128c15-0d1b-4716-a4c5-46997ac7f3bd'
      ),
    });

    const params = clusterClient.updateByQuery.mock.calls[0][0] as UpdateByQueryRequest;

    expect(params.query).toEqual({
      ids: {
        values: ['04128c15-0d1b-4716-a4c5-46997ac7f3bd'],
      },
    });

    expect(params.script).toEqual({
      source: expect.anything(),
      lang: 'painless',
      params: {
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: '2',
          default_system_prompt_id: 'Default',
          model: 'model',
          provider: undefined,
        },
        assignEmpty: false,
        exclude_from_last_conversation_storage: false,
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        messages: [
          {
            '@timestamp': '2019-12-13T16:40:33.400Z',
            content: 'test content',
            is_error: undefined,
            reader: undefined,
            role: 'user',
            trace_data: {
              trace_id: '1',
              transaction_id: '2',
            },
          },
        ],
        replacements: undefined,
        title: 'Welcome 2',
        updated_at: '2023-03-28T22:27:28.159Z',
      },
    });
  });
});
