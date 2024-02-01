/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import aws from 'aws4';
import { PassThrough, Transform } from 'stream';
import { BedrockConnector } from './bedrock';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { RunActionResponseSchema, StreamingResponseSchema } from '../../../common/bedrock/schema';
import {
  BEDROCK_CONNECTOR_ID,
  DEFAULT_BEDROCK_MODEL,
  DEFAULT_BEDROCK_URL,
  DEFAULT_TOKEN_LIMIT,
} from '../../../common/bedrock/constants';
import { DEFAULT_BODY } from '../../../public/connector_types/bedrock/constants';
import { initDashboard } from '../lib/gen_ai/create_gen_ai_dashboard';
import { AxiosError } from 'axios';
jest.mock('../lib/gen_ai/create_gen_ai_dashboard');

// @ts-ignore
const mockSigner = jest.spyOn(aws, 'sign').mockReturnValue({ signed: true });
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
    jest.clearAllMocks();
    mockRequest = jest.fn().mockResolvedValue(mockResponse);
    mockError = jest.fn().mockImplementation(() => {
      throw new Error('API Error');
    });
  });

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

  describe('Bedrock', () => {
    beforeEach(() => {
      // @ts-ignore
      connector.request = mockRequest;
    });

    describe('runApi', () => {
      it('the aws signature has non-streaming headers', async () => {
        await connector.runApi({ body: DEFAULT_BODY });

        expect(mockSigner).toHaveBeenCalledWith(
          {
            body: '{"prompt":"\\n\\nHuman: Hello world! \\n\\nAssistant:","max_tokens_to_sample":8191,"stop_sequences":["\\n\\nHuman:"]}',
            headers: {
              Accept: '*/*',
              'Content-Type': 'application/json',
            },
            host: 'bedrock-runtime.us-east-1.amazonaws.com',
            path: '/model/anthropic.claude-v2/invoke',
            service: 'bedrock',
          },
          { accessKeyId: '123', secretAccessKey: 'secret' }
        );
      });
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

    describe('invokeStream', () => {
      let stream;
      beforeEach(() => {
        stream = createStreamMock();
        stream.write(new Uint8Array([1, 2, 3]));
        mockRequest = jest.fn().mockResolvedValue({ ...mockResponse, data: stream.transform });
        // @ts-ignore
        connector.request = mockRequest;
      });

      const aiAssistantBody = {
        messages: [
          {
            role: 'user',
            content: 'Hello world',
          },
        ],
      };

      it('the aws signature has streaming headers', async () => {
        await connector.invokeStream(aiAssistantBody);

        expect(mockSigner).toHaveBeenCalledWith(
          {
            body: JSON.stringify({
              prompt: '\n\nHuman:Hello world \n\nAssistant:',
              max_tokens_to_sample: DEFAULT_TOKEN_LIMIT,
              temperature: 0.5,
              stop_sequences: ['\n\nHuman:'],
            }),
            headers: {
              accept: 'application/vnd.amazon.eventstream',
              'Content-Type': 'application/json',
              'x-amzn-bedrock-accept': '*/*',
            },
            host: 'bedrock-runtime.us-east-1.amazonaws.com',
            path: '/model/anthropic.claude-v2/invoke-with-response-stream',
            service: 'bedrock',
          },
          { accessKeyId: '123', secretAccessKey: 'secret' }
        );
      });

      it('the API call is successful with correct request parameters', async () => {
        await connector.invokeStream(aiAssistantBody);
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith({
          signed: true,
          url: `${DEFAULT_BEDROCK_URL}/model/${DEFAULT_BEDROCK_MODEL}/invoke-with-response-stream`,
          method: 'post',
          responseSchema: StreamingResponseSchema,
          responseType: 'stream',
          data: JSON.stringify({
            prompt: '\n\nHuman:Hello world \n\nAssistant:',
            max_tokens_to_sample: DEFAULT_TOKEN_LIMIT,
            temperature: 0.5,
            stop_sequences: ['\n\nHuman:'],
          }),
        });
      });

      it('formats messages from user, assistant, and system', async () => {
        await connector.invokeStream({
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
        expect(mockRequest).toHaveBeenCalledWith({
          signed: true,
          responseType: 'stream',
          url: `${DEFAULT_BEDROCK_URL}/model/${DEFAULT_BEDROCK_MODEL}/invoke-with-response-stream`,
          method: 'post',
          responseSchema: StreamingResponseSchema,
          data: JSON.stringify({
            prompt:
              '\n\nHuman:Hello world\n\nHuman:Be a good chatbot\n\nAssistant:Hi, I am a good chatbot\n\nHuman:What is 2+2? \n\nAssistant:',
            max_tokens_to_sample: DEFAULT_TOKEN_LIMIT,
            temperature: 0.5,
            stop_sequences: ['\n\nHuman:'],
          }),
        });
      });

      it('responds with a readable stream', async () => {
        const response = await connector.invokeStream(aiAssistantBody);
        expect(response instanceof PassThrough).toEqual(true);
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(connector.invokeStream(aiAssistantBody)).rejects.toThrow('API Error');
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
        expect(response.message).toEqual(mockResponseString);
      });

      it('formats messages from user, assistant, and system', async () => {
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
        expect(response.message).toEqual(mockResponseString);
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

      it('returns authorization error', () => {
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
          `Unauthorized API Error: The api key was invalid.`
        );
      });

      it('returns endpoint error', () => {
        const err = {
          response: {
            headers: {},
            status: 400,
            statusText: 'Bad Request',
            data: {
              message: 'The requested operation is not recognized by the service.',
            },
          },
        } as AxiosError<{ message?: string }>;

        // @ts-expect-error expects an axios error as the parameter
        expect(connector.getResponseErrorMessage(err)).toEqual(
          `API Error: The requested operation is not recognized by the service.

The Kibana Connector in use may need to be reconfigured with an updated Amazon Bedrock endpoint, like \`bedrock-runtime\`.`
        );
      });
    });
  });

  describe('Token dashboard', () => {
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

function createStreamMock() {
  const transform: Transform = new Transform({});

  return {
    write: (data: Uint8Array) => {
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
