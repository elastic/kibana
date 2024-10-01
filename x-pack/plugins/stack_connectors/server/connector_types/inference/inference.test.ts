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
import { PassThrough, Transform } from 'stream';
import {} from '@kbn/actions-plugin/server/types';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import {
  InferenceInferenceRequest,
  InferenceInferenceResponse,
} from '@elastic/elasticsearch/lib/api/types';
jest.mock('../lib/gen_ai/create_gen_ai_dashboard');
const mockTee = jest.fn();

const OPENAI_CONNECTOR_ID = '123';
const DEFAULT_OPENAI_MODEL = 'gpt-4o';

const mockCreate = jest.fn().mockImplementation(() => ({
  tee: mockTee.mockReturnValue([jest.fn(), jest.fn()]),
}));
const mockDefaults: InferenceInferenceRequest = {
  inference_id: 'test',
  // task_type: 'text_embedding',
  task_settings: {
    input_type: 'ingest',
  },
  input: 'What is Elastic?',
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
  const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
  let mockError: jest.Mock;
  const logger = loggingSystemMock.createLogger();
  const mockResponseString = 'Hello! How can I assist you today?';
  const mockResponse: Promise<InferenceInferenceResponse> = Promise.resolve({
    completion: [
      {
        result:
          'Elastic is a company known for developing the Elasticsearch search and analytics engine, which allows for real-time data search, analysis, and visualization. Elasticsearch is part of the larger Elastic Stack (also known as the ELK Stack), which includes:\n\n1. **Elasticsearch**: A distributed, RESTful search and analytics engine capable of addressing a growing number of use cases. As the heart of the Elastic Stack, it centrally stores your data so you can discover the expected and uncover the unexpected.\n  \n2. **Logstash**: A server-side data processing pipeline that ingests data from multiple sources simultaneously, transforms it, and sends it to your preferred "stash," such as Elasticsearch.\n  \n3. **Kibana**: A data visualization dashboard for Elasticsearch. It allows you to search, view, and interact with data stored in Elasticsearch indices. You can perform advanced data analysis and visualize data in various charts, tables, and maps.\n\n4. **Beats**: Lightweight data shippers for different types of data. They send data from hundreds or thousands of machines and systems to Elasticsearch or Logstash.\n\nThe Elastic Stack is commonly used for various applications, such as log and event data analysis, full-text search, security analytics, business analytics, and more. It is employed across many industries to derive insights from large volumes of structured and unstructured data.\n\nElastic offers both open-source and paid versions of its software, providing a variety of features ranging from basic data ingestion and visualization to advanced machine learning and security capabilities.',
      },
    ],
    connector_id: 'fd681683-de83-48df-8463-122ed7fddbe4',
  });
  beforeEach(() => {
    mockEsClient.inference.inference.mockResolvedValue(mockResponse);
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
          model_id: DEFAULT_OPENAI_MODEL,
        },
        taskType: 'completion',
        inferenceId: 'test',
        providerSchema: [],
        taskTypeConfig: {},
        taskTypeSchema: [],
      },
      secrets: { providerSecrets: { api_key: '123' } },
      logger,
      services: actionsMock.createServices(),
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('performApiCompletion', () => {
      it('uses the default task_type is supplied', async () => {
        const response = await connector.performApiCompletion({
          input: 'What is Elastic?',
        });
        expect(mockEsClient.inference).toBeCalledTimes(1);
        expect(mockEsClient.inference).toHaveBeenCalledWith(mockDefaults);
        expect(response).toEqual(mockResponse);
      });

      it('overrides task type specified in the body', async () => {
        const requestBody = { input: 'What is Elastic?' };
        const response = await connector.performApiCompletion(requestBody);
        expect(mockEsClient.inference).toBeCalledTimes(1);
        expect(mockEsClient.inference).toHaveBeenCalledWith({
          ...mockDefaults,
          data: JSON.stringify({ ...requestBody, stream: false }),
        });
        expect(response).toEqual(mockResponse);
      });

      it('the Inference API call is successful with correct parameters', async () => {
        const response = await connector.performApiCompletion({
          input: 'What is Elastic?',
        });
        expect(mockEsClient.inference).toBeCalledTimes(1);
        expect(mockEsClient.inference).toHaveBeenCalledWith({
          ...mockDefaults,
          data: JSON.stringify({
            input: 'What is Elastic?',
          }),
        });
        expect(response).toEqual(mockResponse);
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        mockEsClient.inference = mockError;

        await expect(connector.performApiCompletion({ input: 'What is Elastic?' })).rejects.toThrow(
          'API Error'
        );
      });
    });

    describe('streamApi', () => {
      it('the Inference API call is successful with correct parameters when stream = false', async () => {
        const response = await connector.performApiCompletionStream({
          input: 'What is Elastic?',
        });
        expect(mockEsClient.inference).toBeCalledTimes(1);
        expect(mockEsClient.inference).toHaveBeenCalledWith({
          data: JSON.stringify({
            input: 'What is Elastic?',
          }),
        });
        expect(response).toEqual(mockResponse);
      });

      it('the OpenAI API call is successful with correct parameters when stream = true', async () => {
        const response = await connector.performApiCompletionStream({
          input: 'What is Elastic?',
        });
        expect(mockEsClient.inference).toBeCalledTimes(1);
        expect(mockEsClient.inference).toHaveBeenCalledWith({
          responseType: 'stream',
          data: JSON.stringify({
            input: 'What is Elastic?',
          }),
        });
        expect(response).toEqual({
          headers: { 'Content-Type': 'dont-compress-this' },
          ...mockResponse,
        });
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        mockEsClient.inference = mockError;

        await expect(
          connector.performApiCompletionStream({ input: 'What is Elastic?' })
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
        mockEsClient.inference.inference.mockResolvedValue({
          ...mockResponse,
          // data: streamMock.transform,
        });
        return mockEsClient.inference;
      };
      beforeEach(() => {
        // @ts-ignore
        mockEsClient.inference = mockStream();
      });

      it('the API call is successful with correct request parameters', async () => {
        await connector.performApiCompletionStream({ input: 'What is Elastic?' });
        expect(mockEsClient.inference).toBeCalledTimes(1);
        expect(mockEsClient.inference).toHaveBeenCalledWith({
          responseType: 'stream',
          data: JSON.stringify({
            input: 'What is Elastic?',

            model: DEFAULT_OPENAI_MODEL,
          }),
        });
      });

      it('signal is properly passed to streamApi', async () => {
        const signal = jest.fn();
        await connector.performApiCompletionStream({ input: 'What is Elastic?' });

        expect(mockEsClient.inference).toHaveBeenCalledWith({
          responseType: 'stream',
          data: JSON.stringify({
            input: 'What is Elastic?',

            model: DEFAULT_OPENAI_MODEL,
          }),
          signal,
        });
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        mockEsClient.inference = mockError;

        await expect(
          connector.performApiCompletionStream({ input: 'What is Elastic?' })
        ).rejects.toThrow('API Error');
      });

      it('responds with a readable stream', async () => {
        // @ts-ignore
        mockEsClient.inference = mockStream();
        const response = await connector.performApiCompletionStream({
          input: 'What is Elastic?',
        });
        expect(response instanceof PassThrough).toEqual(true);
      });
    });

    describe('performApiRerank', () => {
      it('the API call is successful with correct parameters', async () => {
        const response = await connector.performApiCompletionStream({
          input: 'What is Elastic?',
        });
        expect(mockEsClient.inference).toBeCalledTimes(1);
        expect(mockEsClient.inference).toHaveBeenCalledWith({
          ...mockDefaults,
          data: JSON.stringify({
            input: 'What is Elastic?',
          }),
        });
        expect(response).toEqual(mockResponseString);
      });
    });
  });

  describe('Elasticsearch', () => {
    const connector = new InferenceConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: OPENAI_CONNECTOR_ID },
      config: {
        providerConfig: {
          url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
        },
        provider: 'elasticsearch',
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
      mockEsClient.inference = mockEsClient.inference;
      jest.clearAllMocks();
    });

    describe('performApiTextEmbedding', () => {
      it('test the AzureAI API call is successful with correct parameters', async () => {
        const response = await connector.performApiCompletion({
          input: JSON.stringify(sampleAzureAiBody),
        });
        expect(mockEsClient.inference).toBeCalledTimes(1);
        expect(mockEsClient.inference).toHaveBeenCalledWith({
          ...mockDefaults,
          url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
          data: JSON.stringify({ ...sampleAzureAiBody, stream: false }),
          headers: {
            'api-key': '123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual(mockResponse);
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
        expect(mockEsClient.inference).toBeCalledTimes(1);
        expect(mockEsClient.inference).toHaveBeenCalledWith({
          ...mockDefaults,
          url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
          data: JSON.stringify({ ...sampleAzureAiBody, stream: false }),
          headers: {
            'api-key': '123',
            'content-type': 'application/json',
          },
        });
        expect(response).toEqual(mockResponse);
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        mockEsClient.inference = mockError;

        await expect(
          connector.performApiCompletion({ input: JSON.stringify(sampleAzureAiBody) })
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
