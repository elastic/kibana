/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { BaseMessage } from 'langchain/schema';

import { mockActionResponse } from '../__mocks__/action_result_data';
import { postActionsConnectorExecuteRoute } from './post_actions_connector_execute';
import { ElasticAssistantRequestHandlerContext } from '../types';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';

jest.mock('../lib/build_response', () => ({
  buildResponse: jest.fn().mockImplementation((x) => x),
}));
jest.mock('../lib/executor', () => ({
  executeAction: jest.fn().mockImplementation((x) => ({
    connector_id: 'mock-connector-id',
    data: mockActionResponse,
    status: 'ok',
  })),
}));

jest.mock('../lib/langchain/execute_custom_llm_chain', () => ({
  callAgentExecutor: jest.fn().mockImplementation(
    async ({
      connectorId,
    }: {
      actions: ActionsPluginStart;
      connectorId: string;
      esClient: ElasticsearchClient;
      langChainMessages: BaseMessage[];
      logger: Logger;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request: KibanaRequest<unknown, unknown, any, any>;
    }) => {
      if (connectorId === 'mock-connector-id') {
        return {
          connector_id: 'mock-connector-id',
          data: mockActionResponse,
          status: 'ok',
        };
      } else {
        throw new Error('simulated error');
      }
    }
  ),
}));

const mockContext = {
  elasticAssistant: {
    actions: jest.fn(),
    getRegisteredTools: jest.fn(() => []),
    logger: loggingSystemMock.createLogger(),
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
    params: {
      subActionParams: {
        messages: [
          { role: 'user', content: '\\n\\n\\n\\nWhat is my name?' },
          {
            role: 'assistant',
            content:
              "I'm sorry, but I don't have the information about your name. You can tell me your name if you'd like, and we can continue our conversation from there.",
          },
          { role: 'user', content: '\\n\\nMy name is Andrew' },
          {
            role: 'assistant',
            content:
              "Hello, Andrew! It's nice to meet you. What would you like to talk about today?",
          },
          { role: 'user', content: '\\n\\nDo you know my name?' },
        ],
      },
      subAction: 'invokeAI',
    },
    assistantLangChain: true,
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
  });

  it('returns the expected response when assistantLangChain=false', async () => {
    const mockRouter = {
      post: jest.fn().mockImplementation(async (_, handler) => {
        const result = await handler(
          mockContext,
          {
            ...mockRequest,
            body: {
              ...mockRequest.body,
              assistantLangChain: false,
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

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });

  it('returns the expected response when assistantLangChain=true', async () => {
    const mockRouter = {
      post: jest.fn().mockImplementation(async (_, handler) => {
        const result = await handler(mockContext, mockRequest, mockResponse);

        expect(result).toEqual({
          body: {
            connector_id: 'mock-connector-id',
            data: mockActionResponse,
            replacements: {},
            status: 'ok',
          },
        });
      }),
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
      post: jest.fn().mockImplementation(async (_, handler) => {
        const result = await handler(mockContext, requestWithBadConnectorId, mockResponse);

        expect(result).toEqual({
          body: 'simulated error',
          statusCode: 500,
        });
      }),
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>,
      mockGetElser
    );
  });
});
