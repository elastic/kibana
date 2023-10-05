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
import { RunActionResponseSchema } from '../../../common/bedrock/schema';
import {
  BEDROCK_CONNECTOR_ID,
  DEFAULT_BEDROCK_MODEL,
  DEFAULT_BEDROCK_URL,
  DEFAULT_TOKEN_LIMIT,
} from '../../../common/bedrock/constants';
import { DEFAULT_BODY } from '../../../public/connector_types/bedrock/constants';
import { AxiosError } from 'axios';

jest.mock('aws4', () => ({
  sign: () => ({ signed: true }),
}));

describe('BedrockConnector', () => {
  let mockRequest: jest.Mock;
  let mockError: jest.Mock;
  const mockResponseString = 'Hello! How can I assist you today?';
  const mockResponse = {
    headers: {},
    data: {
      completion: mockResponseString,
      stop_reason: 'stop_sequence',
    },
  };
  beforeEach(() => {
    mockRequest = jest.fn().mockResolvedValue(mockResponse);
    mockError = jest.fn().mockImplementation(() => {
      throw new Error('API Error');
    });
  });

  describe('Bedrock', () => {
    const connector = new BedrockConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: BEDROCK_CONNECTOR_ID },
      config: {
        apiUrl: DEFAULT_BEDROCK_URL,
        defaultModel: DEFAULT_BEDROCK_MODEL,
      },
      secrets: { accessKey: '123', secret: 'secret' },
      logger: loggingSystemMock.createLogger(),
      services: actionsMock.createServices(),
    });

    beforeEach(() => {
      // @ts-ignore
      connector.request = mockRequest;
      jest.clearAllMocks();
    });

    describe('runApi', () => {
      it('the Bedrock API call is successful with correct parameters', async () => {
        const response = await connector.runApi({ body: DEFAULT_BODY });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          signed: true,
          timeout: 120000,
          url: `${DEFAULT_BEDROCK_URL}/model/${DEFAULT_BEDROCK_MODEL}/invoke`,
          method: 'post',
          responseSchema: RunActionResponseSchema,
          data: DEFAULT_BODY,
        });
        expect(response).toEqual(mockResponse.data);
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(connector.runApi({ body: DEFAULT_BODY })).rejects.toThrow('API Error');
      });
    });

    describe('invokeAI', () => {
      const aiAssistantBody = {
        messages: [
          {
            role: 'user',
            content: 'Hello world',
          },
        ],
      };

      it('the API call is successful with correct parameters', async () => {
        const response = await connector.invokeAI(aiAssistantBody);
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          signed: true,
          timeout: 120000,
          url: `${DEFAULT_BEDROCK_URL}/model/${DEFAULT_BEDROCK_MODEL}/invoke`,
          method: 'post',
          responseSchema: RunActionResponseSchema,
          data: JSON.stringify({
            prompt: '\n\nHuman:Hello world \n\nAssistant:',
            max_tokens_to_sample: DEFAULT_TOKEN_LIMIT,
            temperature: 0.5,
            stop_sequences: ['\n\nHuman:'],
          }),
        });
        expect(response).toEqual(mockResponseString);
      });

      it('Properly formats messages from user, assistant, and system', async () => {
        const response = await connector.invokeAI({
          messages: [
            {
              role: 'user',
              content: 'Hello world',
            },
            {
              role: 'system',
              content: 'Be a good chatbot',
            },
            {
              role: 'assistant',
              content: 'Hi, I am a good chatbot',
            },
            {
              role: 'user',
              content: 'What is 2+2?',
            },
          ],
        });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          signed: true,
          timeout: 120000,
          url: `${DEFAULT_BEDROCK_URL}/model/${DEFAULT_BEDROCK_MODEL}/invoke`,
          method: 'post',
          responseSchema: RunActionResponseSchema,
          data: JSON.stringify({
            prompt:
              '\n\nHuman:Hello world\n\nHuman:Be a good chatbot\n\nAssistant:Hi, I am a good chatbot\n\nHuman:What is 2+2? \n\nAssistant:',
            max_tokens_to_sample: DEFAULT_TOKEN_LIMIT,
            temperature: 0.5,
            stop_sequences: ['\n\nHuman:'],
          }),
        });
        expect(response).toEqual(mockResponseString);
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(connector.invokeAI(aiAssistantBody)).rejects.toThrow('API Error');
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
              message: 'Resource not found',
            },
          },
        } as AxiosError<{ message?: string }>;
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
              message: 'The api key was invalid.',
            },
          },
        } as AxiosError<{ message?: string }>;

        // @ts-expect-error expects an axios error as the parameter
        expect(connector.getResponseErrorMessage(err)).toEqual(
          `Unauthorized API Error - The api key was invalid.`
        );
      });
    });
  });
});
