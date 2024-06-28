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
  getConversationMock,
  getQueryConversationParams,
} from '../../__mocks__/conversations_schema.mock';
import { AuthenticatedUser } from '@kbn/core-security-common';

describe('Delete conversation route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const mockUser1 = {
    username: 'my_username',
    authentication_realm: {
      type: 'my_realm_type',
      name: 'my_realm_name',
    },
  } as AuthenticatedUser;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
      getConversationMock(getQueryConversationParams())
    );
    context.elasticAssistant.getCurrentUser.mockReturnValue(mockUser1);
    deleteConversationRoute(server.router);
  });

  describe('status codes with getAIAssistantConversationsDataClient', () => {
    test('returns 200 when deleting a single conversation with a valid getAIAssistantConversationsDataClient by Id', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
        getConversationMock(getQueryConversationParams())
      );
      const response = await server.inject(
        getDeleteConversationRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
    });

    test('returns 404 when deleting a single rule that does not exist with a valid actionClient and alertClient', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
        null
      );

      const response = await server.inject(
        getDeleteConversationRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'conversation id: "04128c15-0d1b-4716-a4c5-46997ac7f3bd" not found',
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
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });
});
