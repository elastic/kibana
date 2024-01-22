/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { requestContextMock } from '../../__mocks__/request_context';
import { serverMock } from '../../__mocks__/server';
import { readConversationRoute } from './read_route';
import { getFindConversationsResultWithSingleHit } from '../../__mocks__/response';
import {
  getConversationReadRequest,
  getConversationReadRequestWithId,
  requestMock,
} from '../../__mocks__/request';
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID } from '@kbn/elastic-assistant-common';

describe('Read conversation route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const myFakeId = '99403909-ca9b-49ba-9d7a-7e5320e68d05';
  beforeEach(() => {
    server = serverMock.create();
    logger = loggingSystemMock.createLogger();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantConversationsDataClient.findConversations.mockResolvedValue(
      getFindConversationsResultWithSingleHit()
    );
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

    test('returns 200 when reading a single rule outcome === exactMatch', async () => {
      const response = await server.inject(
        getConversationReadRequestWithId(myFakeId),
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
  });

  describe('data validation', () => {
    test('returns 404 if given a non-existent id', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
        {}
      );
      const request = requestMock.create({
        method: 'get',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        query: { id: 'DNE_RULE' },
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'rule_id: "DNE_RULE" not found', status_code: 404 });
    });
  });
});
