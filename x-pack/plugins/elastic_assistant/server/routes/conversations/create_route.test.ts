/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { requestContextMock } from '../../__mocks__/request_context';
import { serverMock } from '../../__mocks__/server';
import { createConversationRoute } from './create_route';
import {
  getBasicEmptySearchResponse,
  getEmptyFindResult,
  getFindConversationsResultWithSingleHit,
} from '../../__mocks__/response';
import { getCreateConversationRequest, requestMock } from '../../__mocks__/request';
import {
  getCreateConversationSchemaMock,
  getConversationMock,
  getQueryConversationParams,
} from '../../__mocks__/conversations_schema.mock';
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL } from '@kbn/elastic-assistant-common';

describe('Create conversation route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantConversationsDataClient.findConversations.mockResolvedValue(
      getEmptyFindResult()
    ); // no current conversations
    clients.elasticAssistant.getAIAssistantConversationsDataClient.createConversation.mockResolvedValue(
      getConversationMock(getQueryConversationParams())
    ); // creation succeeds

    context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(getBasicEmptySearchResponse())
    );
    createConversationRoute(server.router);
  });

  describe('status codes', () => {
    test('returns 200 with a conversation created via AIAssistantConversationsDataClient', async () => {
      const response = await server.inject(
        getCreateConversationRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });
  });

  describe('unhappy paths', () => {
    test('returns a duplicate error if conversation_id already exists', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.findConversations.mockResolvedValue(
        getFindConversationsResultWithSingleHit()
      );
      const response = await server.inject(
        getCreateConversationRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(409);
      expect(response.body).toEqual({
        message: expect.stringContaining('already exists'),
        status_code: 409,
      });
    });

    test('catches error if creation throws', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.createConversation.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const response = await server.inject(
        getCreateConversationRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('request validation', () => {
    test('allows rule type of query', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
        body: {
          ...getCreateConversationSchemaMock(),
          type: 'query',
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows unknown rule type', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
        body: {
          ...getCreateConversationSchemaMock(),
          type: 'unexpected_type',
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });
  describe('conversation containing messages', () => {
    const getResponseAction = (command: string = 'isolate') => ({
      role: 'user',
      params: {
        command,
        comment: '',
      },
    });
    const defaultAction = getResponseAction();

    test('is successful', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
        body: {
          ...getCreateConversationSchemaMock(),
          response_actions: [defaultAction],
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(200);
    });

    test('fails when provided with an unsupported message role', async () => {
      const wrongMessage = getResponseAction('test_thing');

      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
        body: {
          ...getCreateConversationSchemaMock(),
          messages: [wrongMessage],
        },
      });
      const result = await server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith(
        'messages.0.role: Invalid literal value, expected "user", messages.0.params.command: Invalid literal value, expected "isolate"'
      );
    });
  });
});
