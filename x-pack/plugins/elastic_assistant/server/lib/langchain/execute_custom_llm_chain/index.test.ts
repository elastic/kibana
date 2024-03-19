/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

import { ActionsClientLlm } from '../llm/actions_client_llm';
import { mockActionResponse } from '../../../__mocks__/action_result_data';
import { langChainMessages } from '../../../__mocks__/lang_chain_messages';
import { ESQL_RESOURCE } from '../../../routes/knowledge_base/constants';
import { ResponseBody } from '../types';
import { callAgentExecutor } from '.';

jest.mock('../llm/actions_client_llm');

const mockConversationChain = {
  call: jest.fn(),
};

jest.mock('langchain/chains', () => ({
  RetrievalQAChain: {
    fromLLM: jest.fn().mockImplementation(() => mockConversationChain),
  },
}));

const mockCall = jest.fn();
jest.mock('langchain/agents', () => ({
  initializeAgentExecutorWithOptions: jest.fn().mockImplementation(() => ({
    call: mockCall.mockReturnValueOnce({ output: mockActionResponse.message }),
  })),
}));

jest.mock('../elasticsearch_store/elasticsearch_store', () => ({
  ElasticsearchStore: jest.fn().mockImplementation(() => ({
    asRetriever: jest.fn(),
    isModelInstalled: jest.fn().mockResolvedValue(true),
  })),
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
const mockTelemetry = coreMock.createSetup().analytics;
const esClientMock = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
const defaultProps = {
  actions: mockActions,
  isEnabledKnowledgeBase: true,
  connectorId: mockConnectorId,
  esClient: esClientMock,
  langChainMessages,
  logger: mockLogger,
  onNewReplacements: jest.fn(),
  request: mockRequest,
  kbResource: ESQL_RESOURCE,
  telemetry: mockTelemetry,
  replacements: [],
};
describe('callAgentExecutor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an instance of ActionsClientLlm with the expected context from the request', async () => {
    await callAgentExecutor(defaultProps);

    expect(ActionsClientLlm).toHaveBeenCalledWith({
      actions: mockActions,
      connectorId: mockConnectorId,
      logger: mockLogger,
      request: mockRequest,
    });
  });

  it('kicks off the chain with (only) the last message', async () => {
    await callAgentExecutor(defaultProps);

    // We don't care about the `config` argument, so we use `expect.anything()`
    expect(mockCall).toHaveBeenCalledWith(
      {
        input: '\n\nDo you know my name?',
      },
      expect.anything()
    );
  });

  it('kicks off the chain with the expected message when langChainMessages has only one entry', async () => {
    const onlyOneMessage = [langChainMessages[0]];

    await callAgentExecutor({
      ...defaultProps,
      langChainMessages: onlyOneMessage,
    });

    // We don't care about the `config` argument, so we use `expect.anything()`
    expect(mockCall).toHaveBeenCalledWith(
      {
        input: 'What is my name?',
      },
      expect.anything()
    );
  });

  it('returns the expected response body', async () => {
    const result: ResponseBody = await callAgentExecutor(defaultProps);

    expect(result).toEqual({
      connector_id: 'mock-connector-id',
      data: mockActionResponse.message,
      status: 'ok',
      replacements: [],
    });
  });
});
