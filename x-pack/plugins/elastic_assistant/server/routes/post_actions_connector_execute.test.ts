/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { BaseMessage } from 'langchain/schema';

import { mockActionResultData } from '../__mocks__/action_result_data';
import { postActionsConnectorExecuteRoute } from './post_actions_connector_execute';
import { ElasticAssistantRequestHandlerContext } from '../types';

jest.mock('../lib/build_response', () => ({
  buildResponse: jest.fn().mockImplementation((x) => x),
}));

jest.mock('../lib/langchain/execute_custom_llm_chain', () => ({
  executeCustomLlmChain: jest.fn().mockImplementation(
    async ({
      connectorId,
    }: {
      actions: ActionsPluginStart;
      connectorId: string;
      langChainMessages: BaseMessage[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request: KibanaRequest<unknown, unknown, any, any>;
    }) => {
      if (connectorId === 'mock-connector-id') {
        return {
          connector_id: 'mock-connector-id',
          data: mockActionResultData,
          status: 'ok',
        };
      } else {
        throw new Error('simulated error');
      }
    }
  ),
}));

const mockContext = {
  elasticAssistant: async () => ({
    actions: jest.fn(),
  }),
};

const mockRequest = {
  params: { connectorId: 'mock-connector-id' },
  body: {
    params: {
      subActionParams: {
        body: '{"messages":[{"role":"user","content":"\\n\\n\\n\\nWhat is my name?"},{"role":"assistant","content":"I\'m sorry, but I don\'t have the information about your name. You can tell me your name if you\'d like, and we can continue our conversation from there."},{"role":"user","content":"\\n\\nMy name is Andrew"},{"role":"assistant","content":"Hello, Andrew! It\'s nice to meet you. What would you like to talk about today?"},{"role":"user","content":"\\n\\nDo you know my name?"}]}',
      },
      subAction: 'test',
    },
  },
};

const mockResponse = {
  ok: jest.fn().mockImplementation((x) => x),
  error: jest.fn().mockImplementation((x) => x),
};

describe('postActionsConnectorExecuteRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the expected response', async () => {
    const mockRouter = {
      post: jest.fn().mockImplementation(async (_, handler) => {
        const result = await handler(mockContext, mockRequest, mockResponse);

        expect(result).toEqual({
          body: {
            connector_id: 'mock-connector-id',
            data: mockActionResultData,
            status: 'ok',
          },
        });
      }),
    };

    await postActionsConnectorExecuteRoute(
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>
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
      mockRouter as unknown as IRouter<ElasticAssistantRequestHandlerContext>
    );
  });
});
