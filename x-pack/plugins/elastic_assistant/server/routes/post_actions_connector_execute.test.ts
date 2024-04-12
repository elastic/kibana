/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { BaseMessage } from '@langchain/core/messages';
import { NEVER } from 'rxjs';
import { mockActionResponse } from '../__mocks__/action_result_data';
import { postActionsConnectorExecuteRoute } from './post_actions_connector_execute';
import { ElasticAssistantRequestHandlerContext } from '../types';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import {
  INVOKE_ASSISTANT_ERROR_EVENT,
  INVOKE_ASSISTANT_SUCCESS_EVENT,
} from '../lib/telemetry/event_based_telemetry';
import { PassThrough } from 'stream';
import { getConversationResponseMock } from '../ai_assistant_data_clients/conversations/update_conversation.test';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { getFindAnonymizationFieldsResultWithSingleHit } from '../__mocks__/response';

const actionsClient = actionsClientMock.create();
jest.mock('../lib/build_response', () => ({
  buildResponse: jest.fn().mockImplementation((x) => x),
}));
jest.mock('../lib/executor', () => ({
  executeAction: jest.fn().mockImplementation(async ({ connectorId }) => {
    if (connectorId === 'mock-connector-id') {
      return {
        connector_id: 'mock-connector-id',
        data: mockActionResponse,
        status: 'ok',
      };
    } else {
      throw new Error('simulated error');
    }
  }),
}));
const mockStream = jest.fn().mockImplementation(() => new PassThrough());
jest.mock('../lib/langchain/execute_custom_llm_chain', () => ({
  callAgentExecutor: jest.fn().mockImplementation(
    async ({
      connectorId,
      isStream,
    }: {
      actions: ActionsPluginStart;
      connectorId: string;
      esClient: ElasticsearchClient;
      langChainMessages: BaseMessage[];
      logger: Logger;
      isStream: boolean;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request: KibanaRequest<unknown, unknown, any, any>;
    }) => {
      if (!isStream && connectorId === 'mock-connector-id') {
        return {
          body: {
            connector_id: 'mock-connector-id',
            data: mockActionResponse,
            status: 'ok',
          },
          headers: { 'content-type': 'application/json' },
        };
      } else if (isStream && connectorId === 'mock-connector-id') {
        return {
          body: mockStream,
          headers: {
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Transfer-Encoding': 'chunked',
            'X-Accel-Buffering': 'no',
            'X-Content-Type-Options': 'nosniff',
          },
        };
      } else {
        throw new Error('simulated error');
      }
    }
  ),
}));
const existingConversation = getConversationResponseMock();
const reportEvent = jest.fn();
const appendConversationMessages = jest.fn();
const mockContext = {
  elasticAssistant: {
    actions: {
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClient),
    },
    getRegisteredTools: jest.fn(() => []),
    logger: loggingSystemMock.createLogger(),
    telemetry: { ...coreMock.createSetup().analytics, reportEvent },
    getCurrentUser: () => ({
      username: 'user',
      email: 'email',
      fullName: 'full name',
      roles: ['user-role'],
      enabled: true,
      authentication_realm: { name: 'native1', type: 'native' },
      lookup_realm: { name: 'native1', type: 'native' },
      authentication_provider: { type: 'basic', name: 'basic1' },
      authentication_type: 'realm',
      elastic_cloud_user: false,
      metadata: { _reserved: false },
    }),
    getAIAssistantConversationsDataClient: jest.fn().mockResolvedValue({
      getConversation: jest.fn().mockResolvedValue(existingConversation),
      updateConversation: jest.fn().mockResolvedValue(existingConversation),
      appendConversationMessages:
        appendConversationMessages.mockResolvedValue(existingConversation),
    }),
    getAIAssistantAnonymizationFieldsDataClient: jest.fn().mockResolvedValue({
      findDocuments: jest.fn().mockResolvedValue(getFindAnonymizationFieldsResultWithSingleHit()),
    }),
  },
  core: {
    elasticsearch: {
      client: elasticsearchServiceMock.createScopedClusterClient(),
    },
    savedObjects: coreMock.createRequestHandlerContext().savedObjects,
  },
};

const mockRequest = {
  params: { connectorId: 'mock-connector-id' },
  body: {
    subAction: 'invokeAI',
    message: 'Do you know my name?',
    actionTypeId: '.gen-ai',
    isEnabledKnowledgeBase: true,
    isEnabledRAGAlerts: false,
    replacements: {},
  },
  events: {
    aborted$: NEVER,
  },
};

const mockResponse = {
  ok: jest.fn().mockImplementation((x) => x),
  error: jest.fn().mockImplementation((x) => x),
};

describe('postActionsConnectorExecuteRoute', () => {
  const mockGetElser = jest.fn().mockResolvedValue('.elser_model_2');

  beforeEach(() => {
    jest.clearAllMocks();
    actionsClient.getBulk.mockResolvedValue([
      {
        id: '1',
        isPreconfigured: false,
        isSystemAction: false,
        isDeprecated: false,
        name: 'my name',
        actionTypeId: '.gen-ai',
        isMissingSecrets: false,
        config: {
          a: true,
          b: true,
          c: true,
        },
      },
    ]);
  });

  it('returns the expected response when isEnabledKnowledgeBase=false', async () => {
    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              const result = await handler(
                mockContext,
                {
                  ...mockRequest,
                  body: {
                    ...mockRequest.body,
                    isEnabledKnowledgeBase: false,
                  },
                },
                mockResponse
              );

              expect(result).toEqual({
                body: {
                  connector_id: 'mock-connector-id',
                  data: mockActionResponse,
                  status: 'ok',
                },
              });
            }),
          };
        }),
      },
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('returns the expected response when isEnabledKnowledgeBase=true', async () => {
    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              const result = await handler(mockContext, mockRequest, mockResponse);

              expect(result).toEqual({
                body: {
                  connector_id: 'mock-connector-id',
                  data: mockActionResponse,
                  status: 'ok',
                },
                headers: { 'content-type': 'application/json' },
              });
            }),
          };
        }),
      },
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('returns the expected error when executeCustomLlmChain fails', async () => {
    const requestWithBadConnectorId = {
      ...mockRequest,
      params: { connectorId: 'bad-connector-id' },
    };

    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              const result = await handler(mockContext, requestWithBadConnectorId, mockResponse);

              expect(result).toEqual({
                body: 'simulated error',
                statusCode: 500,
              });
            }),
          };
        }),
      },
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('reports success events to telemetry - kb on, RAG alerts off', async () => {
    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              await handler(mockContext, mockRequest, mockResponse);

              expect(reportEvent).toHaveBeenCalledWith(INVOKE_ASSISTANT_SUCCESS_EVENT.eventType, {
                isEnabledKnowledgeBase: true,
                isEnabledRAGAlerts: false,
              });
            }),
          };
        }),
      },
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('reports success events to telemetry - kb on, RAG alerts on', async () => {
    const ragRequest = {
      ...mockRequest,
      body: {
        ...mockRequest.body,
        anonymizationFields: [
          { id: '@timestamp', field: '@timestamp', allowed: true, anonymized: false },
          { id: 'host.name', field: 'host.name', allowed: true, anonymized: true },
        ],
        replacements: [],
        isEnabledRAGAlerts: true,
      },
    };

    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              await handler(mockContext, ragRequest, mockResponse);

              expect(reportEvent).toHaveBeenCalledWith(INVOKE_ASSISTANT_SUCCESS_EVENT.eventType, {
                isEnabledKnowledgeBase: true,
                isEnabledRAGAlerts: true,
              });
            }),
          };
        }),
      },
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('reports success events to telemetry - kb off, RAG alerts on', async () => {
    const req = {
      ...mockRequest,
      body: {
        ...mockRequest.body,
        isEnabledKnowledgeBase: false,
        anonymizationFields: [
          { id: '@timestamp', field: '@timestamp', allowed: true, anonymized: false },
          { id: 'host.name', field: 'host.name', allowed: true, anonymized: true },
        ],
        replacements: [],
        isEnabledRAGAlerts: true,
      },
    };

    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              await handler(mockContext, req, mockResponse);

              expect(reportEvent).toHaveBeenCalledWith(INVOKE_ASSISTANT_SUCCESS_EVENT.eventType, {
                isEnabledKnowledgeBase: false,
                isEnabledRAGAlerts: true,
              });
            }),
          };
        }),
      },
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('reports success events to telemetry - kb off, RAG alerts off', async () => {
    const req = {
      ...mockRequest,
      body: {
        ...mockRequest.body,
        isEnabledKnowledgeBase: false,
      },
    };

    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              await handler(mockContext, req, mockResponse);

              expect(reportEvent).toHaveBeenCalledWith(INVOKE_ASSISTANT_SUCCESS_EVENT.eventType, {
                isEnabledKnowledgeBase: false,
                isEnabledRAGAlerts: false,
              });
            }),
          };
        }),
      },
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('reports error events to telemetry - kb on, RAG alerts off', async () => {
    const requestWithBadConnectorId = {
      ...mockRequest,
      params: { connectorId: 'bad-connector-id' },
    };

    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              await handler(mockContext, requestWithBadConnectorId, mockResponse);

              expect(reportEvent).toHaveBeenCalledWith(INVOKE_ASSISTANT_ERROR_EVENT.eventType, {
                errorMessage: 'simulated error',
                isEnabledKnowledgeBase: true,
                isEnabledRAGAlerts: false,
              });
            }),
          };
        }),
      },
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('reports error events to telemetry - kb on, RAG alerts on', async () => {
    const badRequest = {
      ...mockRequest,
      params: { connectorId: 'bad-connector-id' },
      body: {
        ...mockRequest.body,
        isEnabledRAGAlerts: true,
      },
    };

    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              await handler(mockContext, badRequest, mockResponse);

              expect(reportEvent).toHaveBeenCalledWith(INVOKE_ASSISTANT_ERROR_EVENT.eventType, {
                errorMessage: 'simulated error',
                isEnabledKnowledgeBase: true,
                isEnabledRAGAlerts: true,
              });
            }),
          };
        }),
      },
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('reports error events to telemetry - kb off, RAG alerts on', async () => {
    const badRequest = {
      ...mockRequest,
      params: { connectorId: 'bad-connector-id' },
      body: {
        ...mockRequest.body,
        isEnabledKnowledgeBase: false,
        anonymizationFields: [
          { id: '@timestamp', field: '@timestamp', allowed: true, anonymized: false },
          { id: 'host.name', field: 'host.name', allowed: true, anonymized: true },
        ],
        replacements: [],
        isEnabledRAGAlerts: true,
      },
    };

    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              await handler(mockContext, badRequest, mockResponse);

              expect(reportEvent).toHaveBeenCalledWith(INVOKE_ASSISTANT_ERROR_EVENT.eventType, {
                errorMessage: 'simulated error',
                isEnabledKnowledgeBase: false,
                isEnabledRAGAlerts: true,
              });
            }),
          };
        }),
      },
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('Adds error to conversation history', async () => {
    const badRequest = {
      ...mockRequest,
      params: { connectorId: 'bad-connector-id' },
      body: {
        ...mockRequest.body,
        conversationId: '99999',
      },
    };

    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              await handler(mockContext, badRequest, mockResponse);
              expect(appendConversationMessages.mock.calls[1][0].messages[0]).toEqual(
                expect.objectContaining({
                  content: 'simulated error',
                  isError: true,
                  role: 'assistant',
                })
              );
            }),
          };
        }),
      },
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('reports error events to telemetry - kb off, RAG alerts off', async () => {
    const badRequest = {
      ...mockRequest,
      params: { connectorId: 'bad-connector-id' },
      body: {
        ...mockRequest.body,
        isEnabledKnowledgeBase: false,
      },
    };

    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              await handler(mockContext, badRequest, mockResponse);

              expect(reportEvent).toHaveBeenCalledWith(INVOKE_ASSISTANT_ERROR_EVENT.eventType, {
                errorMessage: 'simulated error',
                isEnabledKnowledgeBase: false,
                isEnabledRAGAlerts: false,
              });
            }),
          };
        }),
      },
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('returns the expected response when subAction=invokeStream and actionTypeId=.gen-ai', async () => {
    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              const result = await handler(
                mockContext,
                {
                  ...mockRequest,
                  body: {
                    ...mockRequest.body,
                    subAction: 'invokeStream',
                    actionTypeId: '.gen-ai',
                  },
                },
                mockResponse
              );

              expect(result).toEqual({
                body: mockStream,
                headers: {
                  'Cache-Control': 'no-cache',
                  Connection: 'keep-alive',
                  'Transfer-Encoding': 'chunked',
                  'X-Accel-Buffering': 'no',
                  'X-Content-Type-Options': 'nosniff',
                },
              });
            }),
          };
        }),
      },
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('returns the expected response when subAction=invokeStream and actionTypeId=.bedrock', async () => {
    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest.fn().mockImplementation(async (_, handler) => {
              const result = await handler(
                mockContext,
                {
                  ...mockRequest,
                  body: {
                    ...mockRequest.body,
                    subAction: 'invokeStream',
                    actionTypeId: '.bedrock',
                  },
                },
                mockResponse
              );

              expect(result).toEqual({
                body: {
                  connector_id: 'mock-connector-id',
                  data: mockActionResponse,
                  status: 'ok',
                },
                headers: {
                  'content-type': 'application/json',
                },
              });
            }),
          };
        }),
      },
    };
    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });
});
