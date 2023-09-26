/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';

import { ResponseBody } from '../helpers';
import { ActionsClientLlm } from '../llm/actions_client_llm';
import { mockActionResultData } from '../../../__mocks__/action_result_data';
import { langChainMessages } from '../../../__mocks__/lang_chain_messages';
import { executeCustomLlmChain } from '.';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

jest.mock('../llm/actions_client_llm');

const mockConversationChain = {
  call: jest.fn(),
};

jest.mock('langchain/chains', () => ({
  ConversationalRetrievalQAChain: {
    fromLLM: jest.fn().mockImplementation(() => mockConversationChain),
  },
}));

const mockConnectorId = 'mock-connector-id';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRequest: KibanaRequest<unknown, unknown, any, any> = {} as KibanaRequest<
  unknown,
  unknown,
  any, // eslint-disable-line @typescript-eslint/no-explicit-any
  any // eslint-disable-line @typescript-eslint/no-explicit-any
>;

const mockActions: ActionsPluginStart = {} as ActionsPluginStart;
const mockLogger = loggerMock.create();
const esClientMock = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;

describe('executeCustomLlmChain', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    ActionsClientLlm.prototype.getActionResultData = jest
      .fn()
      .mockReturnValueOnce(mockActionResultData);
  });

  it('creates an instance of ActionsClientLlm with the expected context from the request', async () => {
    await executeCustomLlmChain({
      actions: mockActions,
      connectorId: mockConnectorId,
      esClient: esClientMock,
      langChainMessages,
      logger: mockLogger,
      request: mockRequest,
    });

    expect(ActionsClientLlm).toHaveBeenCalledWith({
      actions: mockActions,
      connectorId: mockConnectorId,
      logger: mockLogger,
      request: mockRequest,
    });
  });

  it('kicks off the chain with (only) the last message', async () => {
    await executeCustomLlmChain({
      actions: mockActions,
      connectorId: mockConnectorId,
      esClient: esClientMock,
      langChainMessages,
      logger: mockLogger,
      request: mockRequest,
    });

    expect(mockConversationChain.call).toHaveBeenCalledWith({
      question: '\n\nDo you know my name?',
    });
  });

  it('kicks off the chain with the expected message when langChainMessages has only one entry', async () => {
    const onlyOneMessage = [langChainMessages[0]];

    await executeCustomLlmChain({
      actions: mockActions,
      connectorId: mockConnectorId,
      esClient: esClientMock,
      langChainMessages: onlyOneMessage,
      logger: mockLogger,
      request: mockRequest,
    });

    expect(mockConversationChain.call).toHaveBeenCalledWith({
      question: 'What is my name?',
    });
  });

  it('returns the expected response body', async () => {
    const result: ResponseBody = await executeCustomLlmChain({
      actions: mockActions,
      connectorId: mockConnectorId,
      esClient: esClientMock,
      langChainMessages,
      logger: mockLogger,
      request: mockRequest,
    });

    expect(result).toEqual({
      connector_id: 'mock-connector-id',
      data: mockActionResultData,
      status: 'ok',
    });
  });
});
