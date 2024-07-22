/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { KibanaRequest } from '@kbn/core/server';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';

import { loggerMock } from '@kbn/logging-mocks';
import { initializeAgentExecutorWithOptions, AgentExecutor } from 'langchain/agents';

import { mockActionResponse } from '../../../__mocks__/action_result_data';
import { langChainMessages } from '../../../__mocks__/lang_chain_messages';
import { KNOWLEDGE_BASE_INDEX_PATTERN } from '../../../routes/knowledge_base/constants';
import { callAgentExecutor } from '.';
import { PassThrough, Stream } from 'stream';
import {
  ActionsClientChatOpenAI,
  ActionsClientBedrockChatModel,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server';
import { AgentExecutorParams } from '../executors/types';
import { ElasticsearchStore } from '../elasticsearch_store/elasticsearch_store';

jest.mock('@kbn/langchain/server', () => {
  const original = jest.requireActual('@kbn/langchain/server');
  return {
    ...original,
    ActionsClientChatOpenAI: jest.fn(),
    ActionsClientBedrockChatModel: jest.fn(),
    ActionsClientSimpleChatModel: jest.fn(),
  };
});

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

jest.mock('langchain/agents');

jest.mock('../elasticsearch_store/elasticsearch_store', () => ({
  ElasticsearchStore: jest.fn().mockImplementation(() => ({
    asRetriever: jest.fn(),
    isModelInstalled: jest.fn().mockResolvedValue(true),
  })),
}));
const mockStream = new PassThrough();
const mockPush = jest.fn();
jest.mock('@kbn/ml-response-stream/server', () => ({
  streamFactory: jest.fn().mockImplementation(() => ({
    DELIMITER: '\n',
    end: jest.fn(),
    push: mockPush,
    responseWithHeaders: {
      body: mockStream,
      headers: {
        'X-Accel-Buffering': 'no',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Transfer-Encoding': 'chunked',
      },
    },
  })),
}));

const mockConnectorId = 'mock-connector-id';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRequest: KibanaRequest<unknown, unknown, any, any> = { body: {} } as KibanaRequest<
  unknown,
  unknown,
  any, // eslint-disable-line @typescript-eslint/no-explicit-any
  any // eslint-disable-line @typescript-eslint/no-explicit-any
>;

const actionsClient = actionsClientMock.create();
const mockLogger = loggerMock.create();
const mockTelemetry = coreMock.createSetup().analytics;
const esClientMock = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
const esStoreMock = new ElasticsearchStore(
  esClientMock,
  KNOWLEDGE_BASE_INDEX_PATTERN,
  mockLogger,
  mockTelemetry
);
const defaultProps: AgentExecutorParams<true> = {
  actionsClient,
  bedrockChatEnabled: false,
  connectorId: mockConnectorId,
  esClient: esClientMock,
  esStore: esStoreMock,
  llmType: 'openai',
  langChainMessages,
  logger: mockLogger,
  onNewReplacements: jest.fn(),
  request: mockRequest,
  replacements: {},
};
const bedrockProps = {
  ...defaultProps,
  llmType: 'bedrock',
};
const bedrockChatProps = {
  ...defaultProps,
  bedrockChatEnabled: true,
  llmType: 'bedrock',
};
const executorMock = initializeAgentExecutorWithOptions as jest.Mock;
const agentExecutorMock = AgentExecutor as unknown as jest.Mock;

describe('callAgentExecutor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    executorMock.mockImplementation((_a, _b, { agentType }) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      call: (props: any, more: any) => mockCall({ ...props, agentType }, more),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invoke: (props: any, more: any) => mockInvoke({ ...props, agentType }, more),
    }));
    agentExecutorMock.mockReturnValue({
      call: mockCall,
      invoke: mockInvoke,
    });
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

  describe('OpenAI', () => {
    describe('when the agent is not streaming', () => {
      it('creates an instance of ActionsClientChatOpenAI with the expected context from the request', async () => {
        await callAgentExecutor(defaultProps);

        expect(ActionsClientChatOpenAI).toHaveBeenCalledWith({
          actionsClient,
          connectorId: mockConnectorId,
          logger: mockLogger,
          maxRetries: 0,
          streaming: false,
          temperature: 0.2,
          llmType: 'openai',
        });
      });

      it('uses the openai-functions agent type', async () => {
        await callAgentExecutor(defaultProps);
        expect(mockCall.mock.calls[0][0].agentType).toEqual('openai-functions');
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
          actionsClient,
          connectorId: mockConnectorId,
          logger: mockLogger,
          maxRetries: 0,
          streaming: true,
          temperature: 0.2,
          llmType: 'openai',
        });
      });

      it('uses the openai-functions agent type', async () => {
        await callAgentExecutor({ ...defaultProps, isStream: true });
        expect(mockInvoke.mock.calls[0][0].agentType).toEqual('openai-functions');
      });
    });
  });

  describe('Bedrock', () => {
    describe('when the agent is not streaming', () => {
      it('creates an instance of ActionsClientSimpleChatModel with the expected context from the request', async () => {
        await callAgentExecutor(bedrockProps);

        expect(ActionsClientSimpleChatModel).toHaveBeenCalledWith({
          actionsClient,
          connectorId: mockConnectorId,
          logger: mockLogger,
          maxRetries: 0,
          streaming: false,
          temperature: 0,
          llmType: 'bedrock',
        });
      });

      it('uses the structured-chat-zero-shot-react-description agent type', async () => {
        await callAgentExecutor(bedrockProps);
        expect(mockCall.mock.calls[0][0].agentType).toEqual(
          'structured-chat-zero-shot-react-description'
        );
      });

      it('returns the expected response', async () => {
        const result = await callAgentExecutor(bedrockProps);

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
      it('creates an instance of ActionsClientSimpleChatModel with the expected context from the request', async () => {
        await callAgentExecutor({ ...bedrockProps, isStream: true });

        expect(ActionsClientSimpleChatModel).toHaveBeenCalledWith({
          actionsClient,
          connectorId: mockConnectorId,
          logger: mockLogger,
          maxRetries: 0,
          streaming: true,
          temperature: 0,
          llmType: 'bedrock',
        });
      });

      it('uses the structured-chat-zero-shot-react-description agent type', async () => {
        await callAgentExecutor({ ...bedrockProps, isStream: true });
        expect(mockInvoke.mock.calls[0][0].agentType).toEqual(
          'structured-chat-zero-shot-react-description'
        );
      });
    });
  });

  describe('BedrockChat', () => {
    describe('when the agent is not streaming', () => {
      it('creates an instance of ActionsClientBedrockChatModel with the expected context from the request', async () => {
        await callAgentExecutor(bedrockChatProps);

        expect(ActionsClientBedrockChatModel).toHaveBeenCalledWith({
          actionsClient,
          connectorId: mockConnectorId,
          logger: mockLogger,
          maxRetries: 0,
          signal: undefined,
          model: undefined,
          streaming: false,
          temperature: 0,
          llmType: 'bedrock',
        });
      });

      it('returns the expected response', async () => {
        const result = await callAgentExecutor(bedrockChatProps);

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
      it('creates an instance of ActionsClientBedrockChatModel with the expected context from the request', async () => {
        await callAgentExecutor({ ...bedrockChatProps, isStream: true });

        expect(ActionsClientBedrockChatModel).toHaveBeenCalledWith({
          actionsClient,
          connectorId: mockConnectorId,
          logger: mockLogger,
          maxRetries: 0,
          signal: undefined,
          model: undefined,
          streaming: true,
          temperature: 0,
          llmType: 'bedrock',
        });
      });
    });
  });

  describe.each([
    ['OpenAI', defaultProps],
    ['Bedrock', bedrockProps],
  ])('Common streaming tests - %s', (_, theProps) => {
    it('returns the expected response', async () => {
      const result = await callAgentExecutor({ ...theProps, isStream: true });
      expect(result.body).toBeInstanceOf(Stream.PassThrough);
      expect(result.headers).toEqual({
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Transfer-Encoding': 'chunked',
        'X-Accel-Buffering': 'no',
        'X-Content-Type-Options': 'nosniff',
      });
    });

    it('onLlmResponse gets called only after final chain step', async () => {
      const mockInvokeWithChainCallback = jest.fn().mockImplementation((a, b, c, d, e, f, g) => {
        b.callbacks[0].handleChainEnd({ output: 'hi' }, '123', '456');
        b.callbacks[0].handleChainEnd({ output: 'hello' }, '123');
        return Promise.resolve();
      });
      (initializeAgentExecutorWithOptions as jest.Mock).mockImplementation(
        (_a, _b, { agentType }) => ({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          call: (props: any, more: any) => mockCall({ ...props, agentType }, more),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          invoke: (props: any, more: any) =>
            mockInvokeWithChainCallback({ ...props, agentType }, more),
        })
      );
      const onLlmResponse = jest.fn(async () => {}); // We need it to be a promise, or it'll crash because of missing `.catch`
      await callAgentExecutor({ ...theProps, onLlmResponse, isStream: true });

      expect(onLlmResponse).toHaveBeenCalledWith(
        'hello',
        {
          traceId: undefined,
          transactionId: undefined,
        },
        false
      );
    });

    it('does not streams token after handleStreamEnd has been called', async () => {
      const mockInvokeWithChainCallback = jest.fn().mockImplementation((a, b, c, d, e, f, g) => {
        b.callbacks[0].handleLLMNewToken('hi', {}, '123', '456');
        b.callbacks[0].handleChainEnd({ output: 'hello' }, '123');
        b.callbacks[0].handleLLMNewToken('hey', {}, '678', '456');
        return Promise.resolve();
      });
      (initializeAgentExecutorWithOptions as jest.Mock).mockImplementation(
        (_a, _b, { agentType }) => ({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          call: (props: any, more: any) => mockCall({ ...props, agentType }, more),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          invoke: (props: any, more: any) =>
            mockInvokeWithChainCallback({ ...props, agentType }, more),
        })
      );
      const onLlmResponse = jest.fn(async () => {}); // We need it to be a promise, or it'll crash because of missing `.catch`
      await callAgentExecutor({ ...theProps, onLlmResponse, isStream: true });

      expect(mockPush).toHaveBeenCalledWith({ payload: 'hi', type: 'content' });
      expect(mockPush).not.toHaveBeenCalledWith({ payload: 'hey', type: 'content' });
    });

    it('only streams tokens with length from the root parentRunId', async () => {
      const mockInvokeWithChainCallback = jest.fn().mockImplementation((a, b, c, d, e, f, g) => {
        b.callbacks[0].handleLLMNewToken('', {}, '123', '456');

        b.callbacks[0].handleLLMNewToken('hi', {}, '123', '456');
        b.callbacks[0].handleLLMNewToken('hello', {}, '555', '666');
        b.callbacks[0].handleLLMNewToken('hey', {}, '678', '456');
        return Promise.resolve();
      });
      (initializeAgentExecutorWithOptions as jest.Mock).mockImplementation(
        (_a, _b, { agentType }) => ({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          call: (props: any, more: any) => mockCall({ ...props, agentType }, more),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          invoke: (props: any, more: any) =>
            mockInvokeWithChainCallback({ ...props, agentType }, more),
        })
      );
      const onLlmResponse = jest.fn();
      await callAgentExecutor({ ...theProps, onLlmResponse, isStream: true });

      expect(mockPush).toHaveBeenCalledWith({ payload: 'hi', type: 'content' });
      expect(mockPush).toHaveBeenCalledWith({ payload: 'hey', type: 'content' });
      expect(mockPush).not.toHaveBeenCalledWith({ payload: 'hello', type: 'content' });
      expect(mockPush).not.toHaveBeenCalledWith({ payload: '', type: 'content' });
    });
  });
});
