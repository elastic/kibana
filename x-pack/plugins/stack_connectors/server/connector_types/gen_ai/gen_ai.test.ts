/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenAiConnector } from './gen_ai';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { GEN_AI_CONNECTOR_ID, OpenAiProviderType } from '../../../common/gen_ai/constants';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { GenAiRunActionResponseSchema } from '../../../common/gen_ai/schema';

describe('GenAiConnector', () => {
  const sampleBody = JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'user',
        content: 'Hello world',
      },
    ],
  });
  const mockResponse = { data: { result: 'success' } };
  const mockRequest = jest.fn().mockResolvedValue(mockResponse);
  const mockError = jest.fn().mockImplementation(() => {
    throw new Error('API Error');
  });

  describe('OpenAI', () => {
    const connector = new GenAiConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: GEN_AI_CONNECTOR_ID },
      config: { apiUrl: 'https://example.com/api', apiProvider: OpenAiProviderType.OpenAi },
      secrets: { apiKey: '123' },
      logger: loggingSystemMock.createLogger(),
      services: actionsMock.createServices(),
    });
    beforeEach(() => {
      // @ts-ignore
      connector.request = mockRequest;
      jest.clearAllMocks();
    });
    it('the OpenAI API call is successful with correct parameters', async () => {
      const response = await connector.runApi({ body: sampleBody });
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        url: 'https://example.com/api',
        method: 'post',
        responseSchema: GenAiRunActionResponseSchema,
        data: sampleBody,
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

      await expect(connector.runApi({ body: sampleBody })).rejects.toThrow('API Error');
    });
  });

  describe('AzureAI', () => {
    const connector = new GenAiConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: GEN_AI_CONNECTOR_ID },
      config: { apiUrl: 'https://example.com/api', apiProvider: OpenAiProviderType.AzureAi },
      secrets: { apiKey: '123' },
      logger: loggingSystemMock.createLogger(),
      services: actionsMock.createServices(),
    });
    beforeEach(() => {
      // @ts-ignore
      connector.request = mockRequest;
      jest.clearAllMocks();
    });
    it('the AzureAI API call is successful with correct parameters', async () => {
      const response = await connector.runApi({ body: sampleBody });
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        url: 'https://example.com/api',
        method: 'post',
        responseSchema: GenAiRunActionResponseSchema,
        data: sampleBody,
        headers: {
          'api-key': '123',
          'content-type': 'application/json',
        },
      });
      expect(response).toEqual({ result: 'success' });
    });
  });
});
