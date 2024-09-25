/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceConnector } from './inference';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { RunActionResponseSchema, StreamingResponseSchema } from '../../../common/openai/schema';
import { PassThrough, Transform } from 'stream';
import {} from '@kbn/actions-plugin/server/types';
jest.mock('../lib/gen_ai/create_gen_ai_dashboard');
const mockTee = jest.fn();

const OPENAI_CONNECTOR_ID = '123';
const DEFAULT_OPENAI_MODEL = 'gpt-4o';

const mockCreate = jest.fn().mockImplementation(() => ({
  tee: mockTee.mockReturnValue([jest.fn(), jest.fn()]),
}));
const mockDefaults = {
  url: 'https://api.openai.com/v1/chat/completions',
  method: 'post',
  responseSchema: RunActionResponseSchema,
};
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    api_key: '123',
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

describe('InferenceConnector', () => {
  let mockRequest: jest.Mock;
  let mockError: jest.Mock;
  const logger = loggingSystemMock.createLogger();
  const mockResponseString = 'Hello! How can I assist you today?';
  const mockResponse = {
    headers: {},
    data: {
      result: 'success',
      choices: [
        {
          message: {
            role: 'assistant',
            content: mockResponseString,
          },
          delta: {
            content: mockResponseString,
          },
          finish_reason: 'stop',
          index: 0,
        },
      ],
      usage: {
        prompt_tokens: 4,
        completion_tokens: 5,
        total_tokens: 9,
      },
    },
  };
  beforeEach(() => {
    mockRequest = jest.fn().mockResolvedValue(mockResponse);
    mockError = jest.fn().mockImplementation(() => {
      throw new Error('API Error');
    });
  });

  describe('InferenceConnector', () => {
    const connector = new InferenceConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: OPENAI_CONNECTOR_ID },
      config: {
        provider: 'openai',
        providerConfig: {
          url: 'https://api.openai.com/v1/chat/completions',
          modelId: DEFAULT_OPENAI_MODEL,
        },
        taskType: 'completion',
        inferenceId: '',
        providerSchema: [],
        taskTypeConfig: {},
      },
      secrets: { providerSecrets: { apiKey: '123' } },
      logger,
      services: actionsMock.createServices(),
    });

    const sampleOpenAiBody = {
      messages: [
        {
          role: 'user',
          content: 'Hello world',
        },
      ],
    };

    beforeEach(() => {
      // @ts-ignore
      connector.request = mockRequest;
      jest.clearAllMocks();
    });

    describe('runApi', () => {
      it('uses the default model if none is supplied', async () => {
        const response = await connector.performApiCompletion({
          input: JSON.stringify(sampleOpenAiBody),
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          ...mockDefaults,
          data: JSON.stringify({
            ...sampleOpenAiBody,

            model: DEFAULT_OPENAI_MODEL,
          }),
          headers: {
            Authorization: 'Bearer 123',
            'X-My-Custom-Header': 'foo',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual(mockResponse.data);
      });

      it('overrides the default model with the default model specified in the body', async () => {
        const requestBody = { model: 'gpt-3.5-turbo', ...sampleOpenAiBody };
        const response = await connector.performApiCompletion({
          input: JSON.stringify(requestBody),
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          ...mockDefaults,
          data: JSON.stringify({ ...requestBody, stream: false }),
          headers: {
            Authorization: 'Bearer 123',
            'X-My-Custom-Header': 'foo',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual(mockResponse.data);
      });

      it('the OpenAI API call is successful with correct parameters', async () => {
        const response = await connector.performApiCompletion({
          input: JSON.stringify(sampleOpenAiBody),
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          ...mockDefaults,
          data: JSON.stringify({
            ...sampleOpenAiBody,

            model: DEFAULT_OPENAI_MODEL,
          }),
          headers: {
            Authorization: 'Bearer 123',
            'X-My-Custom-Header': 'foo',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual(mockResponse.data);
      });

      it('overrides stream parameter if set in the body', async () => {
        const body = {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: 'Hello world',
            },
          ],
        };
        const response = await connector.performApiCompletion({
          input: JSON.stringify({
            ...body,
          }),
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          ...mockDefaults,
          data: JSON.stringify({
            ...body,
          }),
          headers: {
            Authorization: 'Bearer 123',
            'X-My-Custom-Header': 'foo',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual(mockResponse.data);
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(
          connector.performApiCompletion({ input: JSON.stringify(sampleOpenAiBody) })
        ).rejects.toThrow('API Error');
      });
    });

    describe('streamApi', () => {
      it('the OpenAI API call is successful with correct parameters when stream = false', async () => {
        const response = await connector.performApiCompletionStream({
          input: JSON.stringify(sampleOpenAiBody),
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'post',
          responseSchema: RunActionResponseSchema,
          data: JSON.stringify({
            ...sampleOpenAiBody,

            model: DEFAULT_OPENAI_MODEL,
          }),
          headers: {
            Authorization: 'Bearer 123',
            'X-My-Custom-Header': 'foo',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual(mockResponse.data);
      });

      it('the OpenAI API call is successful with correct parameters when stream = true', async () => {
        const response = await connector.performApiCompletionStream({
          input: JSON.stringify(sampleOpenAiBody),
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          responseType: 'stream',
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'post',
          responseSchema: StreamingResponseSchema,
          data: JSON.stringify({
            ...sampleOpenAiBody,

            model: DEFAULT_OPENAI_MODEL,
          }),
          headers: {
            Authorization: 'Bearer 123',
            'X-My-Custom-Header': 'foo',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual({
          headers: { 'Content-Type': 'dont-compress-this' },
          ...mockResponse.data,
        });
      });

      it('overrides stream parameter if set in the body with explicit stream parameter', async () => {
        const body = {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: 'Hello world',
            },
          ],
        };
        const response = await connector.performApiCompletionStream({
          input: JSON.stringify({
            ...body,
          }),
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          responseType: 'stream',
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'post',
          responseSchema: StreamingResponseSchema,
          data: JSON.stringify({
            ...body,
          }),
          headers: {
            Authorization: 'Bearer 123',
            'X-My-Custom-Header': 'foo',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual({
          headers: { 'Content-Type': 'dont-compress-this' },
          ...mockResponse.data,
        });
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(
          connector.performApiCompletionStream({ input: JSON.stringify(sampleOpenAiBody) })
        ).rejects.toThrow('API Error');
      });
    });

    describe('invokeStream', () => {
      const mockStream = (
        dataToStream: string[] = [
          'data: {"object":"chat.completion.chunk","choices":[{"delta":{"content":"My"}}]}\ndata: {"object":"chat.completion.chunk","choices":[{"delta":{"content":" new"}}]}',
        ]
      ) => {
        const streamMock = createStreamMock();
        dataToStream.forEach((chunk) => {
          streamMock.write(chunk);
        });
        streamMock.complete();
        mockRequest = jest.fn().mockResolvedValue({ ...mockResponse, data: streamMock.transform });
        return mockRequest;
      };
      beforeEach(() => {
        // @ts-ignore
        connector.request = mockStream();
      });

      it('the API call is successful with correct request parameters', async () => {
        await connector.performApiCompletionStream({ input: JSON.stringify(sampleOpenAiBody) });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'post',
          responseSchema: StreamingResponseSchema,
          responseType: 'stream',
          data: JSON.stringify({
            ...sampleOpenAiBody,

            model: DEFAULT_OPENAI_MODEL,
          }),
          headers: {
            Authorization: 'Bearer 123',
            'X-My-Custom-Header': 'foo',
            'content-type': 'application/json',
          },
        });
      });

      it('signal is properly passed to streamApi', async () => {
        const signal = jest.fn();
        await connector.performApiCompletionStream({ input: JSON.stringify(sampleOpenAiBody) });

        expect(mockRequest).toHaveBeenCalledWith({
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'post',
          responseSchema: StreamingResponseSchema,
          responseType: 'stream',
          data: JSON.stringify({
            ...sampleOpenAiBody,

            model: DEFAULT_OPENAI_MODEL,
          }),
          headers: {
            Authorization: 'Bearer 123',
            'X-My-Custom-Header': 'foo',
            'content-type': 'application/json',
          },
          signal,
        });
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(
          connector.performApiCompletionStream({ input: JSON.stringify(sampleOpenAiBody) })
        ).rejects.toThrow('API Error');
      });

      it('responds with a readable stream', async () => {
        // @ts-ignore
        connector.request = mockStream();
        const response = await connector.performApiCompletionStream({
          input: JSON.stringify(sampleOpenAiBody),
        });
        expect(response instanceof PassThrough).toEqual(true);
      });
    });

    describe('invokeAI', () => {
      it('the API call is successful with correct parameters', async () => {
        const response = await connector.performApiCompletionStream({
          input: JSON.stringify(sampleOpenAiBody),
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          ...mockDefaults,
          data: JSON.stringify({
            ...sampleOpenAiBody,

            model: DEFAULT_OPENAI_MODEL,
          }),
          headers: {
            Authorization: 'Bearer 123',
            'X-My-Custom-Header': 'foo',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual(mockResponseString);
      });
    });
  });

  describe('AzureAI', () => {
    const connector = new InferenceConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: OPENAI_CONNECTOR_ID },
      config: {
        providerConfig: {
          url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
        },
        provider: 'azureai',
        taskType: '',
        inferenceId: '',
        providerSchema: [],
        taskTypeConfig: {},
      },
      secrets: { providerSecrets: {} },
      logger: loggingSystemMock.createLogger(),
      services: actionsMock.createServices(),
    });

    const sampleAzureAiBody = {
      messages: [
        {
          role: 'user',
          content: 'Hello world',
        },
      ],
    };

    beforeEach(() => {
      // @ts-ignore
      connector.request = mockRequest;
      jest.clearAllMocks();
    });

    describe('runApi', () => {
      it('test the AzureAI API call is successful with correct parameters', async () => {
        const response = await connector.performApiCompletion({
          input: JSON.stringify(sampleAzureAiBody),
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          ...mockDefaults,
          url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
          data: JSON.stringify({ ...sampleAzureAiBody, stream: false }),
          headers: {
            'api-key': '123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual(mockResponse.data);
      });

      it('overrides stream parameter if set in the body', async () => {
        const body = {
          messages: [
            {
              role: 'user',
              content: 'Hello world',
            },
          ],
        };
        const response = await connector.performApiCompletion({
          input: JSON.stringify({ ...body }),
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          ...mockDefaults,
          url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
          data: JSON.stringify({ ...sampleAzureAiBody, stream: false }),
          headers: {
            'api-key': '123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual(mockResponse.data);
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(
          connector.performApiCompletion({ input: JSON.stringify(sampleAzureAiBody) })
        ).rejects.toThrow('API Error');
      });
    });

    describe('streamApi', () => {
      it('the AzureAI API call is successful with correct parameters when stream = false', async () => {
        const response = await connector.performApiCompletionStream({
          input: JSON.stringify(sampleAzureAiBody),
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
          method: 'post',
          responseSchema: RunActionResponseSchema,
          data: JSON.stringify({ ...sampleAzureAiBody, stream: false }),
          headers: {
            'api-key': '123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual(mockResponse.data);
      });

      it('the AzureAI API call is successful with correct parameters when stream = true', async () => {
        const response = await connector.performApiCompletionStream({
          input: JSON.stringify(sampleAzureAiBody),
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          responseType: 'stream',
          url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
          method: 'post',
          responseSchema: StreamingResponseSchema,
          data: JSON.stringify({ ...sampleAzureAiBody }),
          headers: {
            'api-key': '123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual({
          headers: { 'Content-Type': 'dont-compress-this' },
          ...mockResponse.data,
        });
      });

      it('overrides stream parameter if set in the body with explicit stream parameter', async () => {
        const body = {
          messages: [
            {
              role: 'user',
              content: 'Hello world',
            },
          ],
        };
        const response = await connector.performApiCompletionStream({
          input: JSON.stringify({ ...body, stream: false }),
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          responseType: 'stream',
          url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
          method: 'post',
          responseSchema: StreamingResponseSchema,
          data: JSON.stringify({
            ...body,
          }),
          headers: {
            'api-key': '123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual({
          headers: { 'Content-Type': 'dont-compress-this' },
          ...mockResponse.data,
        });
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(
          connector.performApiCompletionStream({ input: JSON.stringify(sampleAzureAiBody) })
        ).rejects.toThrow('API Error');
      });
    });
  });
});

function createStreamMock() {
  const transform: Transform = new Transform({});

  return {
    write: (data: string) => {
      transform.push(data);
    },
    fail: () => {
      transform.emit('error', new Error('Stream failed'));
      transform.end();
    },
    transform,
    complete: () => {
      transform.end();
    },
  };
}
