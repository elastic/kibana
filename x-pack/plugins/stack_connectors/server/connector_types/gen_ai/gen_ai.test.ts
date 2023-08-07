/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenAiConnector } from './gen_ai';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import {
  DEFAULT_OPENAI_MODEL,
  GEN_AI_CONNECTOR_ID,
  OpenAiProviderType,
} from '../../../common/gen_ai/constants';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import {
  GenAiRunActionResponseSchema,
  GenAiStreamingResponseSchema,
} from '../../../common/gen_ai/schema';
import { initGenAiDashboard } from './create_dashboard';
jest.mock('./create_dashboard');

describe('GenAiConnector', () => {
  let mockRequest: jest.Mock;
  let mockError: jest.Mock;
  beforeEach(() => {
    const mockResponse = { headers: {}, data: { result: 'success' } };
    mockRequest = jest.fn().mockResolvedValue(mockResponse);
    mockError = jest.fn().mockImplementation(() => {
      throw new Error('API Error');
    });
  });

  describe('OpenAI', () => {
    const connector = new GenAiConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: GEN_AI_CONNECTOR_ID },
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
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'post',
          responseSchema: GenAiRunActionResponseSchema,
          data: JSON.stringify({ ...sampleOpenAiBody, stream: false, model: DEFAULT_OPENAI_MODEL }),
          headers: {
            Authorization: 'Bearer 123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual({ result: 'success' });
      });

      it('overrides the default model with the default model specified in the body', async () => {
        const requestBody = { model: 'gpt-3.5-turbo', ...sampleOpenAiBody };
        const response = await connector.runApi({ body: JSON.stringify(requestBody) });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'post',
          responseSchema: GenAiRunActionResponseSchema,
          data: JSON.stringify({ ...requestBody, stream: false }),
          headers: {
            Authorization: 'Bearer 123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual({ result: 'success' });
      });

      it('the OpenAI API call is successful with correct parameters', async () => {
        const response = await connector.runApi({ body: JSON.stringify(sampleOpenAiBody) });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'post',
          responseSchema: GenAiRunActionResponseSchema,
          data: JSON.stringify({ ...sampleOpenAiBody, stream: false, model: DEFAULT_OPENAI_MODEL }),
          headers: {
            Authorization: 'Bearer 123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual({ result: 'success' });
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
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'post',
          responseSchema: GenAiRunActionResponseSchema,
          data: JSON.stringify({
            ...body,
            stream: false,
          }),
          headers: {
            Authorization: 'Bearer 123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual({ result: 'success' });
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
          responseSchema: GenAiRunActionResponseSchema,
          data: JSON.stringify({ ...sampleOpenAiBody, stream: false, model: DEFAULT_OPENAI_MODEL }),
          headers: {
            Authorization: 'Bearer 123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual({ result: 'success' });
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
          responseSchema: GenAiStreamingResponseSchema,
          data: JSON.stringify({ ...sampleOpenAiBody, stream: true, model: DEFAULT_OPENAI_MODEL }),
          headers: {
            Authorization: 'Bearer 123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual({
          headers: { 'Content-Type': 'dont-compress-this' },
          result: 'success',
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
          responseSchema: GenAiStreamingResponseSchema,
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
          result: 'success',
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
  });

  describe('AzureAI', () => {
    const connector = new GenAiConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: GEN_AI_CONNECTOR_ID },
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
          url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
          method: 'post',
          responseSchema: GenAiRunActionResponseSchema,
          data: JSON.stringify({ ...sampleAzureAiBody, stream: false }),
          headers: {
            'api-key': '123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual({ result: 'success' });
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
          url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
          method: 'post',
          responseSchema: GenAiRunActionResponseSchema,
          data: JSON.stringify({ ...sampleAzureAiBody, stream: false }),
          headers: {
            'api-key': '123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual({ result: 'success' });
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
          responseSchema: GenAiRunActionResponseSchema,
          data: JSON.stringify({ ...sampleAzureAiBody, stream: false }),
          headers: {
            'api-key': '123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual({ result: 'success' });
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
          responseSchema: GenAiStreamingResponseSchema,
          data: JSON.stringify({ ...sampleAzureAiBody, stream: true }),
          headers: {
            'api-key': '123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual({
          headers: { 'Content-Type': 'dont-compress-this' },
          result: 'success',
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
          responseSchema: GenAiStreamingResponseSchema,
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
          result: 'success',
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
    const connector = new GenAiConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: GEN_AI_CONNECTOR_ID },
      config: { apiUrl: 'https://example.com/api', apiProvider: OpenAiProviderType.AzureAi },
      secrets: { apiKey: '123' },
      logger: loggingSystemMock.createLogger(),
      services: actionsMock.createServices(),
    });
    const mockGenAi = initGenAiDashboard as jest.Mock;
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
