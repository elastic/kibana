/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID } from '@kbn/elastic-assistant-common';
import { requestContextMock } from '../../__mocks__/request_context';
import { serverMock } from '../../__mocks__/server';
import { deleteConversationRoute } from './delete_route';
import { getDeleteConversationRequest, requestMock } from '../../__mocks__/request';
import {
  getEmptyFindResult,
  getFindConversationsResultWithSingleHit,
} from '../../__mocks__/response';

describe('Delete conversation route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantConversationsDataClient.findConversations.mockResolvedValue(
      getFindConversationsResultWithSingleHit()
    );
    deleteConversationRoute(server.router);
  });

  describe('status codes with getAIAssistantConversationsDataClient', () => {
    test('returns 200 when deleting a single conversation with a valid getAIAssistantConversationsDataClient by Id', async () => {
      const response = await server.inject(
        getDeleteConversationRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
    });

    test('returns 404 when deleting a single rule that does not exist with a valid actionClient and alertClient', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.findConversations.mockResolvedValue(
        getEmptyFindResult()
      );

      const response = await server.inject(
        getDeleteConversationRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'conversation id: "conversation-1" not found',
        status_code: 404,
      });
    });

    test('catches error if deletion throws error', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.deleteConversation.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const response = await server.inject(
        getDeleteConversationRequest(),
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
    test('rejects a request with no id', async () => {
      const request = requestMock.create({
        method: 'delete',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        query: {},
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: ['either "id" or "rule_id" must be set'],
        status_code: 400,
      });
    });
  });
});
