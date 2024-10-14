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
import { InferenceInferenceResponse } from '@elastic/elasticsearch/lib/api/types';

const OPENAI_CONNECTOR_ID = '123';
const DEFAULT_OPENAI_MODEL = 'gpt-4o';

describe('InferenceConnector', () => {
  let mockError: jest.Mock;
  const logger = loggingSystemMock.createLogger();
  const mockResponse: InferenceInferenceResponse = {
    completion: [
      {
        result:
          'Elastic is a company known for developing the Elasticsearch search and analytics engine, which allows for real-time data search, analysis, and visualization. Elasticsearch is part of the larger Elastic Stack (also known as the ELK Stack), which includes:\n\n1. **Elasticsearch**: A distributed, RESTful search and analytics engine capable of addressing a growing number of use cases. As the heart of the Elastic Stack, it centrally stores your data so you can discover the expected and uncover the unexpected.\n  \n2. **Logstash**: A server-side data processing pipeline that ingests data from multiple sources simultaneously, transforms it, and sends it to your preferred "stash," such as Elasticsearch.\n  \n3. **Kibana**: A data visualization dashboard for Elasticsearch. It allows you to search, view, and interact with data stored in Elasticsearch indices. You can perform advanced data analysis and visualize data in various charts, tables, and maps.\n\n4. **Beats**: Lightweight data shippers for different types of data. They send data from hundreds or thousands of machines and systems to Elasticsearch or Logstash.\n\nThe Elastic Stack is commonly used for various applications, such as log and event data analysis, full-text search, security analytics, business analytics, and more. It is employed across many industries to derive insights from large volumes of structured and unstructured data.\n\nElastic offers both open-source and paid versions of its software, providing a variety of features ranging from basic data ingestion and visualization to advanced machine learning and security capabilities.',
      },
    ],
  };

  describe('performApiCompletion', () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;

    beforeEach(() => {
      mockEsClient.inference.inference.mockResolvedValue(mockResponse);
      mockError = jest.fn().mockImplementation(() => {
        throw new Error('API Error');
      });
    });

    const services = actionsMock.createServices();
    services.scopedClusterClient = mockEsClient;
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
        taskTypeConfig: {},
      },
      secrets: { providerSecrets: { api_key: '123' } },
      logger,
      services,
    });

    it('uses the completion task_type is supplied', async () => {
      const response = await connector.performApiCompletion({
        input: 'What is Elastic?',
      });
      expect(mockEsClient.inference.inference).toBeCalledTimes(1);
      expect(mockEsClient.inference.inference).toHaveBeenCalledWith(
        {
          inference_id: 'test',
          input: 'What is Elastic?',
          task_type: 'completion',
        },
        { asStream: false }
      );
      expect(response).toEqual(mockResponse.completion);
    });

    it('errors during API calls are properly handled', async () => {
      // @ts-ignore
      mockEsClient.inference.inference = mockError;

      await expect(connector.performApiCompletion({ input: 'What is Elastic?' })).rejects.toThrow(
        'API Error'
      );
    });
  });

  describe('performApiRerank', () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    const mockResponseRerank = {
      rerank: [
        {
          index: 2,
          score: 0.011597361,
          text: 'leia',
        },
        {
          index: 0,
          score: 0.006338922,
          text: 'luke',
        },
      ],
    };

    beforeEach(() => {
      mockEsClient.inference.inference.mockResolvedValue(mockResponseRerank);
      mockError = jest.fn().mockImplementation(() => {
        throw new Error('API Error');
      });
    });
    const services = actionsMock.createServices();
    services.scopedClusterClient = mockEsClient;
    it('the API call is successful with correct parameters', async () => {
      const connectorRerank = new InferenceConnector({
        configurationUtilities: actionsConfigMock.create(),
        connector: { id: '1', type: '123' },
        config: {
          provider: 'googlevertexai',
          providerConfig: {
            model_id: DEFAULT_OPENAI_MODEL,
          },
          taskType: 'rerank',
          inferenceId: 'test-rerank',
          taskTypeConfig: {},
        },
        secrets: { providerSecrets: { api_key: '123' } },
        logger,
        services,
      });
      const response = await connectorRerank.performApiRerank({
        input: ['apple', 'banana'],
        query: 'test',
      });
      expect(mockEsClient.inference.inference).toHaveBeenCalledWith(
        {
          inference_id: 'test-rerank',
          input: ['apple', 'banana'],
          query: 'test',
          task_type: 'rerank',
        },
        { asStream: false }
      );
      expect(response).toEqual(mockResponseRerank.rerank);
    });
  });

  describe('performApiTextEmbedding', () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;

    beforeEach(() => {
      mockEsClient.inference.inference.mockResolvedValue(mockResponse);
      mockError = jest.fn().mockImplementation(() => {
        throw new Error('API Error');
      });
    });

    const services = actionsMock.createServices();
    services.scopedClusterClient = mockEsClient;
    const connectorTextEmbedding = new InferenceConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: OPENAI_CONNECTOR_ID },
      config: {
        providerConfig: {
          url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
        },
        provider: 'elasticsearch',
        taskType: '',
        inferenceId: '',
        taskTypeConfig: {},
      },
      secrets: { providerSecrets: {} },
      logger: loggingSystemMock.createLogger(),
      services,
    });

    it('test the AzureAI API call is successful with correct parameters', async () => {
      const response = await connectorTextEmbedding.performApiTextEmbedding({
        input: 'Hello world',
        inputType: 'ingest',
      });
      expect(mockEsClient.inference.inference).toHaveBeenCalledWith(
        {
          inference_id: '',
          input: 'Hello world',
          task_settings: {
            input_type: 'ingest',
          },
          task_type: 'text_embedding',
        },
        { asStream: false }
      );
      expect(response).toEqual(mockResponse.text_embedding);
    });

    it('errors during API calls are properly handled', async () => {
      // @ts-ignore
      mockEsClient.inference.inference = mockError;

      await expect(
        connectorTextEmbedding.performApiTextEmbedding({
          input: 'Hello world',
          inputType: 'ingest',
        })
      ).rejects.toThrow('API Error');
    });
  });

  describe('performApiCompletionStream', () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockEsClient.inference.inference.mockResolvedValue(streamMock.transform as any);
    };

    beforeEach(() => {
      // @ts-ignore
      mockStream();
    });

    const services = actionsMock.createServices();
    services.scopedClusterClient = mockEsClient;
    const connector = new InferenceConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: OPENAI_CONNECTOR_ID },
      config: {
        providerConfig: {
          url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
        },
        provider: 'elasticsearch',
        taskType: 'completion',
        inferenceId: '',
        taskTypeConfig: {},
      },
      secrets: { providerSecrets: {} },
      logger: loggingSystemMock.createLogger(),
      services,
    });

    it('the API call is successful with correct request parameters', async () => {
      await connector.performApiCompletionStream({ input: 'Hello world' });
      expect(mockEsClient.inference.inference).toBeCalledTimes(1);
      expect(mockEsClient.inference.inference).toHaveBeenCalledWith(
        {
          inference_id: '',
          input: 'Hello world',
          task_type: 'completion',
        },
        { asStream: true }
      );
    });

    it('signal is properly passed to streamApi', async () => {
      const signal = jest.fn() as unknown as AbortSignal;
      await connector.performApiCompletionStream({ input: 'Hello world', signal });

      expect(mockEsClient.inference.inference).toHaveBeenCalledWith(
        {
          inference_id: '',
          input: 'Hello world',
          task_type: 'completion',
        },
        { asStream: true, signal }
      );
    });

    it('errors during API calls are properly handled', async () => {
      // @ts-ignore
      mockEsClient.inference.inference = mockError;

      await expect(
        connector.performApiCompletionStream({ input: 'What is Elastic?' })
      ).rejects.toThrow('API Error');
    });

    it('responds with a readable stream', async () => {
      const response = await connector.performApiCompletionStream({
        input: 'What is Elastic?',
      });
      expect(response instanceof PassThrough).toEqual(true);
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
