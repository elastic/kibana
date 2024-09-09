/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { RequestHandlerContext } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { MockRouter } from '../__mocks__/router.mock';
import { ConversationalChain } from './lib/conversational_chain';
import { getChatParams } from './lib/get_chat_params';
import { createRetriever, defineRoutes } from './routes';

jest.mock('./lib/get_chat_params', () => ({
  getChatParams: jest.fn(),
}));

jest.mock('./lib/conversational_chain');

describe('createRetriever', () => {
  test('works when the question has quotes', () => {
    const esQuery = '{"query": {"match": {"text": "{query}"}}}';
    const question = 'How can I "do something" with quotes?';

    const retriever = createRetriever(esQuery);
    const result = retriever(question);

    expect(result).toEqual({ query: { match: { text: 'How can I "do something" with quotes?' } } });
  });
});

describe('Search Playground routes', () => {
  let mockRouter: MockRouter;
  const mockClient = {
    asCurrentUser: {},
  };

  const mockCore = {
    elasticsearch: { client: mockClient },
  };
  const mockLogger = loggingSystemMock.createLogger().get();

  describe('POST - Chat Messages', () => {
    const mockData = {
      connector_id: 'open-ai',
      indices: 'my-index',
      prompt: 'You are an assistant',
      citations: true,
      elasticsearch_query: {},
      summarization_model: 'gpt-4o',
      doc_size: 3,
      source_fields: '{}',
    };

    const mockRequestBody = {
      data: mockData,
    };

    beforeEach(() => {
      jest.clearAllMocks();

      const coreStart = coreMock.createStart();

      const context = {
        core: Promise.resolve(mockCore),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'post',
        path: '/internal/search_playground/chat',
      });

      defineRoutes({
        logger: mockLogger,
        router: mockRouter.router,
        getStartServices: jest.fn().mockResolvedValue([coreStart, {}, {}]),
      });
    });

    it('responds with error message if stream throws an error', async () => {
      (getChatParams as jest.Mock).mockResolvedValue({ model: 'open-ai' });
      (ConversationalChain as jest.Mock).mockImplementation(() => {
        return {
          stream: jest
            .fn()
            .mockRejectedValue(new Error('Unexpected API error - Some Open AI error message')),
        };
      });

      await mockRouter.callRoute({
        body: mockRequestBody,
      });

      expect(mockRouter.response.badRequest).toHaveBeenCalledWith({
        body: {
          message: 'Unexpected API error - Some Open AI error message',
        },
      });
    });
  });
});
