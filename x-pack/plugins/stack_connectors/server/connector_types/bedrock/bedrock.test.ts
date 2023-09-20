/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BedrockConnector } from './bedrock';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { BedrockRunActionResponseSchema } from '../../../common/bedrock/schema';
import { BEDROCK_CONNECTOR_ID, DEFAULT_BEDROCK_MODEL } from '../../../common/bedrock/constants';
jest.mock('./create_dashboard');

describe('BedrockConnector', () => {
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
    const connector = new BedrockConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: BEDROCK_CONNECTOR_ID },
      config: {
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        defaultModel: DEFAULT_BEDROCK_MODEL,
      },
      secrets: { accessKey: '123', secret: 'secret' },
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
          responseSchema: BedrockRunActionResponseSchema,
          data: JSON.stringify({
            ...sampleOpenAiBody,
            stream: false,
            model: DEFAULT_BEDROCK_MODEL,
          }),
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
          responseSchema: BedrockRunActionResponseSchema,
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
          responseSchema: BedrockRunActionResponseSchema,
          data: JSON.stringify({
            ...sampleOpenAiBody,
            stream: false,
            model: DEFAULT_BEDROCK_MODEL,
          }),
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
          responseSchema: BedrockRunActionResponseSchema,
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
  });
});
