/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID } from '@kbn/elastic-assistant-common';
import { getUpdateConversationRequest, requestMock } from '../../__mocks__/request';
import { requestContextMock } from '../../__mocks__/request_context';
import { serverMock } from '../../__mocks__/server';
import {
  getConversationMock,
  getQueryConversationParams,
  getUpdateConversationSchemaMock,
} from '../../__mocks__/conversations_schema.mock';
import { getEmptyFindResult } from '../../__mocks__/response';
import { updateConversationRoute } from './update_route';

describe('Update conversation route', () => {
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
    clients.elasticAssistant.getAIAssistantConversationsDataClient.updateConversation.mockResolvedValue(
      getConversationMock(getQueryConversationParams())
    ); // successful update

    updateConversationRoute(server.router);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getUpdateConversationRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns 404 when updating a single rule that does not exist', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.findConversations.mockResolvedValue(
        getEmptyFindResult()
      );

      const response = await server.inject(
        getUpdateConversationRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'rule_id: "rule-1" not found',
        status_code: 404,
      });
    });

    test('catches error if search throws error', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.findConversations.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const response = await server.inject(
        getUpdateConversationRequest(),
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
    test('rejects payloads with no ID', async () => {
      const noIdRequest = requestMock.create({
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        body: {
          ...getUpdateConversationSchemaMock(),
          id: undefined,
        },
      });
      const response = await server.inject(noIdRequest, requestContextMock.convertContext(context));
      expect(response.body).toEqual({
        message: ['either "id" or "rule_id" must be set'],
        status_code: 400,
      });
    });

    test('allows query rule type', async () => {
      const request = requestMock.create({
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        body: { ...getUpdateConversationSchemaMock(), type: 'query' },
      });
      const result = await server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects unknown rule type', async () => {
      const request = requestMock.create({
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        body: { ...getUpdateConversationSchemaMock(), type: 'unknown type' },
      });
      const result = await server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('allows rule type of query and custom from and interval', async () => {
      const request = requestMock.create({
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        body: {
          from: 'now-7m',
          interval: '5m',
          ...getUpdateConversationSchemaMock(),
          type: 'query',
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid "from" param on rule', async () => {
      const request = requestMock.create({
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        body: {
          from: 'now-3755555555555555.67s',
          interval: '5m',
          ...getUpdateConversationSchemaMock(),
          type: 'query',
        },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith('from: Failed to parse date-math expression');
    });
  });
});
