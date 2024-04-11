/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { AIAssistantDataClient, AIAssistantDataClientParams } from '.';
import { AuthenticatedUser } from '@kbn/security-plugin/server';

const date = '2023-03-28T22:27:28.159Z';
let logger: ReturnType<typeof loggingSystemMock['createLogger']>;
const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

const mockUser1 = {
  username: 'my_username',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;

describe('AIAssistantDataClient', () => {
  let assistantDataClientParams: AIAssistantDataClientParams;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    assistantDataClientParams = {
      logger,
      elasticsearchClientPromise: Promise.resolve(clusterClient),
      spaceId: 'default',
      indexPatternsResorceName: '.kibana-elastic-ai-assistant-conversations',
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

  describe('getWriter', () => {
    it('should return a writer object', async () => {
      const assistantConversationsDataClient = new AIAssistantDataClient(assistantDataClientParams);
      const writer = await assistantConversationsDataClient.getWriter();
      expect(writer).toBeDefined();
      expect(typeof writer?.bulk).toBe('function');
    });

    it('should cache and return the same writer for the same namespace', async () => {
      const assistantConversationsDataClient = new AIAssistantDataClient({
        ...assistantDataClientParams,
        spaceId: 'default',
      });
      const writer1 = await assistantConversationsDataClient.getWriter();
      const writer2 = await assistantConversationsDataClient.getWriter();

      const assistantConversationsDataClient2 = new AIAssistantDataClient({
        ...assistantDataClientParams,
        spaceId: 'space-1',
      });
      const writer3 = await assistantConversationsDataClient2.getWriter();

      expect(writer1).toEqual(writer2);
      expect(writer2).not.toEqual(writer3);
    });
  });

  describe('getReader', () => {
    it('should return a reader object', async () => {
      const assistantConversationsDataClient = new AIAssistantDataClient(assistantDataClientParams);
      const reader = await assistantConversationsDataClient.getReader();
      expect(reader).toBeDefined();
      expect(typeof reader?.search).toBe('function');
    });

    it('should perform search on the same as reader namespace', async () => {
      const assistantConversationsDataClient = new AIAssistantDataClient({
        ...assistantDataClientParams,
        spaceId: 'default',
      });
      const reader = await assistantConversationsDataClient.getReader();
      const query = { query: { bool: { filter: { range: { '@timestamp': { gte: 0 } } } } } };
      await reader.search({
        body: query,
      });

      expect(clusterClient.search).toHaveBeenCalledWith({
        body: query,
        ignore_unavailable: true,
        index: '.kibana-elastic-ai-assistant-conversations-default',
        seq_no_primary_term: true,
      });
    });

    it('should throw proper error message when search is failed', async () => {
      const assistantConversationsDataClient = new AIAssistantDataClient({
        ...assistantDataClientParams,
        spaceId: 'default',
      });
      clusterClient.search.mockRejectedValueOnce(new Error('something went wrong!'));

      const reader = await assistantConversationsDataClient.getReader();
      const query = { query: { bool: { filter: { range: { '@timestamp': { gte: 0 } } } } } };

      await expect(
        reader.search({
          body: query,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong!"`);

      expect(logger.error).toHaveBeenCalledWith(
        `Error performing search in AIAssistantDataClient - something went wrong!`
      );
    });
  });

  test('should find the conversations successfully defined by search criterias', async () => {
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

    const assistantConversationsDataClient = new AIAssistantDataClient(assistantDataClientParams);
    const result = await assistantConversationsDataClient.findDocuments({
      page: 1,
      perPage: 10,
      filter: '',
    });

    expect(clusterClient.search).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      data: {
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2024-01-25T01:32:37.649Z',
                api_config: {
                  connector_id: 'bedbf764-b991-4115-a9fc-1cfeaef21046',
                  model: 'anthropic.claude-v2',
                },
                created_at: '2024-01-25T01:32:37.649Z',
                is_default: true,
                messages: [
                  {
                    '@timestamp': '1/24/2024, 5:32:19 PM',
                    content:
                      'Go ahead and click the add connector button below to continue the conversation!',
                    is_error: null,
                    reader: null,
                    role: 'assistant',
                  },
                  {
                    '@timestamp': '1/24/2024, 5:32:37 PM',
                    content: 'Connector setup complete!',
                    is_error: null,
                    reader: null,
                    role: 'assistant',
                  },
                  {
                    '@timestamp': '1/24/2024, 5:34:50 PM',
                    content: 'An error occurred sending your message.',
                    is_error: true,
                    reader: null,
                    role: 'assistant',
                  },
                ],
                namespace: 'hghjghjghghjghg33',
                title: 'Alert summary',
                updated_at: '2024-01-25T01:34:51.303Z',
                users: [
                  {
                    id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
                    name: 'elastic',
                  },
                ],
              },
            },
          ],
          total: {
            value: 1,
          },
        },
      },
      page: 1,
      perPage: 10,
      total: 1,
    });
  });
});
