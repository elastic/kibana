/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosError } from 'axios';
import { OpenAIConnector } from './openai';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import {
  DEFAULT_OPENAI_MODEL,
  OPENAI_CONNECTOR_ID,
  OpenAiProviderType,
} from '../../../common/openai/constants';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { RunActionResponseSchema, StreamingResponseSchema } from '../../../common/openai/schema';
import { initDashboard } from './create_dashboard';
jest.mock('./create_dashboard');

describe('OpenAIConnector', () => {
  let mockRequest: jest.Mock;
  let mockError: jest.Mock;
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

  describe('OpenAI', () => {
    const connector = new OpenAIConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: OPENAI_CONNECTOR_ID },
      config: {
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        apiProvider: OpenAiProviderType.OpenAi,
        defaultModel: DEFAULT_OPENAI_MODEL,
      },
      secrets: { apiKey: '123' },
      logger: loggingSystemMock.createLogger(),
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
        const response = await connector.runApi({ body: JSON.stringify(sampleOpenAiBody) });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          timeout: 120000,
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'post',
          responseSchema: RunActionResponseSchema,
          data: JSON.stringify({ ...sampleOpenAiBody, stream: false, model: DEFAULT_OPENAI_MODEL }),
          headers: {
            Authorization: 'Bearer 123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual(mockResponse.data);
      });

      it('overrides the default model with the default model specified in the body', async () => {
        const requestBody = { model: 'gpt-3.5-turbo', ...sampleOpenAiBody };
        const response = await connector.runApi({ body: JSON.stringify(requestBody) });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          timeout: 120000,
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'post',
          responseSchema: RunActionResponseSchema,
          data: JSON.stringify({ ...requestBody, stream: false }),
          headers: {
            Authorization: 'Bearer 123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual(mockResponse.data);
      });

      it('the OpenAI API call is successful with correct parameters', async () => {
        const response = await connector.runApi({ body: JSON.stringify(sampleOpenAiBody) });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          timeout: 120000,
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'post',
          responseSchema: RunActionResponseSchema,
          data: JSON.stringify({ ...sampleOpenAiBody, stream: false, model: DEFAULT_OPENAI_MODEL }),
          headers: {
            Authorization: 'Bearer 123',
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
        const response = await connector.runApi({
          body: JSON.stringify({
            ...body,
            stream: true,
          }),
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          timeout: 120000,
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'post',
          responseSchema: RunActionResponseSchema,
          data: JSON.stringify({
            ...body,
            stream: false,
          }),
          headers: {
            Authorization: 'Bearer 123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual(mockResponse.data);
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(connector.runApi({ body: JSON.stringify(sampleOpenAiBody) })).rejects.toThrow(
          'API Error'
        );
      });
    });

    describe('streamApi', () => {
      it('the OpenAI API call is successful with correct parameters when stream = false', async () => {
        const response = await connector.streamApi({
          body: JSON.stringify(sampleOpenAiBody),
          stream: false,
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'post',
          responseSchema: RunActionResponseSchema,
          data: JSON.stringify({ ...sampleOpenAiBody, stream: false, model: DEFAULT_OPENAI_MODEL }),
          headers: {
            Authorization: 'Bearer 123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual(mockResponse.data);
      });

      it('the OpenAI API call is successful with correct parameters when stream = true', async () => {
        const response = await connector.streamApi({
          body: JSON.stringify(sampleOpenAiBody),
          stream: true,
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          responseType: 'stream',
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'post',
          responseSchema: StreamingResponseSchema,
          data: JSON.stringify({ ...sampleOpenAiBody, stream: true, model: DEFAULT_OPENAI_MODEL }),
          headers: {
            Authorization: 'Bearer 123',
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
        const response = await connector.streamApi({
          body: JSON.stringify({
            ...body,
            stream: false,
          }),
          stream: true,
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          responseType: 'stream',
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'post',
          responseSchema: StreamingResponseSchema,
          data: JSON.stringify({
            ...body,
            stream: true,
          }),
          headers: {
            Authorization: 'Bearer 123',
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
          connector.streamApi({ body: JSON.stringify(sampleOpenAiBody), stream: true })
        ).rejects.toThrow('API Error');
      });
    });

    describe('invokeAI', () => {
      it('the API call is successful with correct parameters', async () => {
        const response = await connector.invokeAI(sampleOpenAiBody);
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          timeout: 120000,
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'post',
          responseSchema: RunActionResponseSchema,
          data: JSON.stringify({ ...sampleOpenAiBody, stream: false, model: DEFAULT_OPENAI_MODEL }),
          headers: {
            Authorization: 'Bearer 123',
            'content-type': 'application/json',
          },
        });
        expect(response.message).toEqual(mockResponseString);
        expect(response.usage.total_tokens).toEqual(9);
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(connector.invokeAI(sampleOpenAiBody)).rejects.toThrow('API Error');
      });
    });
    describe('getResponseErrorMessage', () => {
      it('returns an unknown error message', () => {
        // @ts-expect-error expects an axios error as the parameter
        expect(connector.getResponseErrorMessage({})).toEqual(
          `Unexpected API Error:  - Unknown error`
        );
      });

      it('returns the error.message', () => {
        // @ts-expect-error expects an axios error as the parameter
        expect(connector.getResponseErrorMessage({ message: 'a message' })).toEqual(
          `Unexpected API Error:  - a message`
        );
      });

      it('returns the error.response.data.error.message', () => {
        const err = {
          response: {
            headers: {},
            status: 404,
            statusText: 'Resource Not Found',
            data: {
              error: {
                message: 'Resource not found',
              },
            },
          },
        } as AxiosError<{ error?: { message?: string } }>;
        expect(
          // @ts-expect-error expects an axios error as the parameter
          connector.getResponseErrorMessage(err)
        ).toEqual(`API Error: Resource Not Found - Resource not found`);
      });

      it('returns auhtorization error', () => {
        const err = {
          response: {
            headers: {},
            status: 401,
            statusText: 'Auth error',
            data: {
              error: {
                message: 'The api key was invalid.',
              },
            },
          },
        } as AxiosError<{ error?: { message?: string } }>;

        // @ts-expect-error expects an axios error as the parameter
        expect(connector.getResponseErrorMessage(err)).toEqual(
          `Unauthorized API Error - The api key was invalid.`
        );
      });
    });
  });

  describe('AzureAI', () => {
    const connector = new OpenAIConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: OPENAI_CONNECTOR_ID },
      config: {
        apiUrl:
          'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
        apiProvider: OpenAiProviderType.AzureAi,
      },
      secrets: { apiKey: '123' },
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
        const response = await connector.runApi({ body: JSON.stringify(sampleAzureAiBody) });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          timeout: 120000,
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

      it('overrides stream parameter if set in the body', async () => {
        const body = {
          messages: [
            {
              role: 'user',
              content: 'Hello world',
            },
          ],
        };
        const response = await connector.runApi({
          body: JSON.stringify({ ...body, stream: true }),
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          timeout: 120000,
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

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(connector.runApi({ body: JSON.stringify(sampleAzureAiBody) })).rejects.toThrow(
          'API Error'
        );
      });
    });

    describe('streamApi', () => {
      it('the AzureAI API call is successful with correct parameters when stream = false', async () => {
        const response = await connector.streamApi({
          body: JSON.stringify(sampleAzureAiBody),
          stream: false,
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
        const response = await connector.streamApi({
          body: JSON.stringify(sampleAzureAiBody),
          stream: true,
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          responseType: 'stream',
          url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
          method: 'post',
          responseSchema: StreamingResponseSchema,
          data: JSON.stringify({ ...sampleAzureAiBody, stream: true }),
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
        const response = await connector.streamApi({
          body: JSON.stringify({ ...body, stream: false }),
          stream: true,
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          responseType: 'stream',
          url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
          method: 'post',
          responseSchema: StreamingResponseSchema,
          data: JSON.stringify({
            ...body,
            stream: true,
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
          connector.streamApi({ body: JSON.stringify(sampleAzureAiBody), stream: true })
        ).rejects.toThrow('API Error');
      });
    });
  });

  describe('Token dashboard', () => {
    const connector = new OpenAIConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: OPENAI_CONNECTOR_ID },
      config: { apiUrl: 'https://example.com/api', apiProvider: OpenAiProviderType.AzureAi },
      secrets: { apiKey: '123' },
      logger: loggingSystemMock.createLogger(),
      services: actionsMock.createServices(),
    });
    const mockGenAi = initDashboard as jest.Mock;
    beforeEach(() => {
      // @ts-ignore
      connector.esClient.transport.request = mockRequest;
      mockRequest.mockResolvedValue({ has_all_requested: true });
      mockGenAi.mockResolvedValue({ success: true });
      jest.clearAllMocks();
    });
    it('the create dashboard API call returns available: true when user has correct permissions', async () => {
      const response = await connector.getDashboard({ dashboardId: '123' });
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          index: [
            {
              names: ['.kibana-event-log-*'],
              allow_restricted_indices: true,
              privileges: ['read'],
            },
          ],
        },
      });
      expect(response).toEqual({ available: true });
    });
    it('the create dashboard API call returns available: false when user has correct permissions', async () => {
      mockRequest.mockResolvedValue({ has_all_requested: false });
      const response = await connector.getDashboard({ dashboardId: '123' });
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          index: [
            {
              names: ['.kibana-event-log-*'],
              allow_restricted_indices: true,
              privileges: ['read'],
            },
          ],
        },
      });
      expect(response).toEqual({ available: false });
    });

    it('the create dashboard API call returns available: false when init dashboard fails', async () => {
      mockGenAi.mockResolvedValue({ success: false });
      const response = await connector.getDashboard({ dashboardId: '123' });
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          index: [
            {
              names: ['.kibana-event-log-*'],
              allow_restricted_indices: true,
              privileges: ['read'],
            },
          ],
        },
      });
      expect(response).toEqual({ available: false });
    });
  });
});
