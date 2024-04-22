/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requestContextMock } from '../../__mocks__/request_context';
import { serverMock } from '../../__mocks__/server';
import { readConversationRoute } from './read_route';
import { getConversationReadRequest, requestMock } from '../../__mocks__/request';
import {
  getConversationMock,
  getQueryConversationParams,
} from '../../__mocks__/conversations_schema.mock';
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID } from '@kbn/elastic-assistant-common';
import { AuthenticatedUser } from '@kbn/security-plugin-types-common';

describe('Read conversation route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const mockUser1 = {
    username: 'my_username',
    authentication_realm: {
      type: 'my_realm_type',
      name: 'my_realm_name',
    },
  } as AuthenticatedUser;

  const myFakeId = '99403909-ca9b-49ba-9d7a-7e5320e68d05';
  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
      getConversationMock(getQueryConversationParams())
    );
    context.elasticAssistant.getCurrentUser.mockReturnValue(mockUser1);
    readConversationRoute(server.router);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getConversationReadRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns 200 when reading a single conversation outcome === exactMatch', async () => {
      const response = await server.inject(
        getConversationReadRequest(myFakeId),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('catches error if search throws error', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const response = await server.inject(
        getConversationReadRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });

    test('returns 401 Unauthorized when request context getCurrentUser is not defined', async () => {
      context.elasticAssistant.getCurrentUser.mockReturnValueOnce(null);
      const response = await server.inject(
        getConversationReadRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(401);
    });
  });

  describe('data validation', () => {
    test('returns 404 if given a non-existent id', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
        null
      );
      const request = requestMock.create({
        method: 'get',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        params: { id: '99403909-ca9b-49ba-9d7a-7e5320e68d05' },
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'conversation id: "99403909-ca9b-49ba-9d7a-7e5320e68d05" not found',
        status_code: 404,
      });
    });
  });
});
