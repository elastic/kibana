/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamGraph } from './helpers';
import agent from 'elastic-apm-node';
import { KibanaRequest } from '@kbn/core-http-server';
import { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common';
import { PassThrough } from 'stream';
import { loggerMock } from '@kbn/logging-mocks';
import { AGENT_NODE_TAG } from './nodes/run_agent';
import { waitFor } from '@testing-library/react';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import { DefaultAssistantGraph } from './graph';

jest.mock('elastic-apm-node');

jest.mock('@kbn/securitysolution-es-utils');
const mockStream = new PassThrough();
const mockPush = jest.fn();
const mockResponseWithHeaders = {
  body: mockStream,
  headers: {
    'X-Accel-Buffering': 'no',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Transfer-Encoding': 'chunked',
  },
};
jest.mock('@kbn/ml-response-stream/server', () => ({
  streamFactory: jest.fn().mockImplementation(() => ({
    DELIMITER: '\n',
    end: jest.fn(),
    push: mockPush,
    responseWithHeaders: mockResponseWithHeaders,
  })),
}));

describe('streamGraph', () => {
  const mockRequest = {} as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  const mockLogger = loggerMock.create();
  const mockApmTracer = {} as APMTracer;
  const mockStreamEvents = jest.fn();
  const mockAssistantGraph = {
    streamEvents: mockStreamEvents,
  } as unknown as DefaultAssistantGraph;
  const mockOnLlmResponse = jest.fn().mockResolvedValue(null);

  beforeEach(() => {
    jest.clearAllMocks();
    (agent.isStarted as jest.Mock).mockReturnValue(true);
    (agent.startSpan as jest.Mock).mockReturnValue({
      end: jest.fn(),
      ids: { 'trace.id': 'traceId' },
      transaction: { ids: { 'transaction.id': 'transactionId' } },
    });
  });
  describe('ActionsClientChatOpenAI', () => {
    it('should execute the graph in streaming mode', async () => {
      mockStreamEvents.mockReturnValue({
        next: jest
          .fn()
          .mockResolvedValueOnce({
            value: {
              name: 'ActionsClientChatOpenAI',
              event: 'on_llm_stream',
              data: { chunk: { message: { content: 'content' } } },
              tags: [AGENT_NODE_TAG],
            },
            done: false,
          })
          .mockResolvedValueOnce({
            value: {
              name: 'ActionsClientChatOpenAI',
              event: 'on_llm_end',
              data: {
                output: {
                  generations: [
                    [{ generationInfo: { finish_reason: 'stop' }, text: 'final message' }],
                  ],
                },
              },
              tags: [AGENT_NODE_TAG],
            },
          })
          .mockResolvedValue({
            done: true,
          }),
        return: jest.fn(),
      });

      const response = await streamGraph({
        apmTracer: mockApmTracer,
        assistantGraph: mockAssistantGraph,
        inputs: {
          input: 'input',
          bedrockChatEnabled: false,
          llmType: 'openai',
          responseLanguage: 'English',
        },
        logger: mockLogger,
        onLlmResponse: mockOnLlmResponse,
        request: mockRequest,
      });

      expect(response).toBe(mockResponseWithHeaders);
      expect(mockPush).toHaveBeenCalledWith({ payload: 'content', type: 'content' });
      await waitFor(() => {
        expect(mockOnLlmResponse).toHaveBeenCalledWith(
          'final message',
          { transactionId: 'transactionId', traceId: 'traceId' },
          false
        );
      });
    });
  });

  describe('ActionsClientSimpleChatModel', () => {
    it('should execute the graph in streaming mode', async () => {
      mockStreamEvents.mockReturnValue({
        next: jest
          .fn()
          .mockResolvedValueOnce({
            value: {
              name: 'ActionsClientSimpleChatModel',
              event: 'on_llm_stream',
              data: {
                chunk: {
                  content:
                    '```json\n\n  "action": "Final Answer",\n  "action_input": "Look at these',
                },
              },
              tags: [AGENT_NODE_TAG],
            },
            done: false,
          })
          .mockResolvedValueOnce({
            value: {
              name: 'ActionsClientSimpleChatModel',
              event: 'on_llm_stream',
              data: {
                chunk: {
                  content: ' rare IP',
                },
              },
              tags: [AGENT_NODE_TAG],
            },
            done: false,
          })
          .mockResolvedValueOnce({
            value: {
              name: 'ActionsClientSimpleChatModel',
              event: 'on_llm_stream',
              data: {
                chunk: {
                  content: ' addresses." }```',
                },
              },
              tags: [AGENT_NODE_TAG],
            },
            done: false,
          })
          .mockResolvedValueOnce({
            value: {
              name: 'ActionsClientSimpleChatModel',
              event: 'on_llm_end',
              tags: [AGENT_NODE_TAG],
            },
          })
          .mockResolvedValue({
            done: true,
          }),
        return: jest.fn(),
      });

      const response = await streamGraph({
        apmTracer: mockApmTracer,
        assistantGraph: mockAssistantGraph,
        inputs: {
          input: 'input',
          bedrockChatEnabled: false,
          responseLanguage: 'English',
          llmType: 'gemini',
        },
        logger: mockLogger,
        onLlmResponse: mockOnLlmResponse,
        request: mockRequest,
      });

      expect(response).toBe(mockResponseWithHeaders);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith({ type: 'content', payload: 'Look at these' });
        expect(mockPush).toHaveBeenCalledWith({ type: 'content', payload: ' rare IP' });
        expect(mockPush).toHaveBeenCalledWith({ type: 'content', payload: ' addresses.' });
        expect(mockOnLlmResponse).toHaveBeenCalledWith(
          'Look at these rare IP addresses.',
          { transactionId: 'transactionId', traceId: 'traceId' },
          false
        );
      });
    });
  });
});
