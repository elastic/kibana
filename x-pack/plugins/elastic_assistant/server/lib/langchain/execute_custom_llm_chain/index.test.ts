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

import { mockActionResponse } from '../../../__mocks__/action_result_data';
import { langChainMessages } from '../../../__mocks__/lang_chain_messages';
import { ESQL_RESOURCE } from '../../../routes/knowledge_base/constants';
import { callAgentExecutor } from '.';
import { Stream } from 'stream';
import { ActionsClientChatOpenAI, ActionsClientLlm } from '@kbn/elastic-assistant-common';

jest.mock('@kbn/elastic-assistant-common', () => ({
  ActionsClientChatOpenAI: jest.fn(),
  ActionsClientLlm: jest.fn(),
}));

const mockConversationChain = {
  call: jest.fn(),
};

jest.mock('langchain/chains', () => ({
  RetrievalQAChain: {
    fromLLM: jest.fn().mockImplementation(() => mockConversationChain),
  },
}));

const mockCall = jest.fn().mockImplementation(() =>
  Promise.resolve({
    output: mockActionResponse,
  })
);
const mockInvoke = jest.fn().mockImplementation(() => Promise.resolve());
jest.mock('langchain/agents', () => ({
  initializeAgentExecutorWithOptions: jest.fn().mockImplementation((_a, _b, { agentType }) => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    call: (props: any) => mockCall({ ...props, agentType }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    invoke: (props: any) => mockInvoke({ ...props, agentType }),
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
  llmType: 'openai',
  langChainMessages,
  logger: mockLogger,
  onNewReplacements: jest.fn(),
  request: mockRequest,
  kbResource: ESQL_RESOURCE,
  telemetry: mockTelemetry,
  replacements: {},
};
describe('callAgentExecutor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('callAgentExecutor', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('kicks off the chain with (only) the last message', async () => {
      await callAgentExecutor(defaultProps);

      expect(mockCall.mock.calls[0][0].input).toEqual('\n\nDo you know my name?');
    });

    it('kicks off the chain with the expected message when langChainMessages has only one entry', async () => {
      const onlyOneMessage = [langChainMessages[0]];

      await callAgentExecutor({
        ...defaultProps,
        langChainMessages: onlyOneMessage,
      });
      expect(mockCall.mock.calls[0][0].input).toEqual('What is my name?');
    });
  });
  describe('when the agent is not streaming', () => {
    it('creates an instance of ActionsClientLlm with the expected context from the request', async () => {
      await callAgentExecutor(defaultProps);

      expect(ActionsClientLlm).toHaveBeenCalledWith({
        actions: mockActions,
        connectorId: mockConnectorId,
        logger: mockLogger,
        maxRetries: 0,
        request: mockRequest,
        streaming: false,
        llmType: 'openai',
      });
    });

    it('uses the chat-conversational-react-description agent type', async () => {
      await callAgentExecutor(defaultProps);

      expect(mockCall.mock.calls[0][0].agentType).toEqual('chat-conversational-react-description');
    });

    it('returns the expected response', async () => {
      const result = await callAgentExecutor(defaultProps);

      expect(result).toEqual({
        body: {
          connector_id: 'mock-connector-id',
          data: mockActionResponse,
          status: 'ok',
          replacements: {},
          trace_data: undefined,
        },
        headers: {
          'content-type': 'application/json',
        },
      });
    });
  });
  describe('when the agent is streaming', () => {
    it('creates an instance of ActionsClientChatOpenAI with the expected context from the request', async () => {
      await callAgentExecutor({ ...defaultProps, isStream: true });

      expect(ActionsClientChatOpenAI).toHaveBeenCalledWith({
        actions: mockActions,
        connectorId: mockConnectorId,
        logger: mockLogger,
        maxRetries: 0,
        request: mockRequest,
        streaming: true,
        llmType: 'openai',
      });
    });

    it('uses the openai-functions agent type', async () => {
      await callAgentExecutor({ ...defaultProps, isStream: true });

      expect(mockInvoke.mock.calls[0][0].agentType).toEqual('openai-functions');
    });

    it('returns the expected response', async () => {
      const result = await callAgentExecutor({ ...defaultProps, isStream: true });
      expect(result.body).toBeInstanceOf(Stream.PassThrough);
      expect(result.headers).toEqual({
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Transfer-Encoding': 'chunked',
        'X-Accel-Buffering': 'no',
        'X-Content-Type-Options': 'nosniff',
      });
    });
  });
});
