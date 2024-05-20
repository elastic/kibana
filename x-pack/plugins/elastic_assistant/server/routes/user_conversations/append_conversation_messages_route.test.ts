/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID_MESSAGES } from '@kbn/elastic-assistant-common';
import { getAppendConversationMessageRequest, requestMock } from '../../__mocks__/request';
import { requestContextMock } from '../../__mocks__/request_context';
import { serverMock } from '../../__mocks__/server';
import {
  getAppendConversationMessagesSchemaMock,
  getConversationMock,
  getQueryConversationParams,
  getUpdateConversationSchemaMock,
} from '../../__mocks__/conversations_schema.mock';
import { appendConversationMessageRoute } from './append_conversation_messages_route';
import { AuthenticatedUser } from '@kbn/security-plugin-types-common';

describe('Append conversation messages route', () => {
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
    clients.elasticAssistant.getAIAssistantConversationsDataClient.appendConversationMessages.mockResolvedValue(
      getConversationMock(getQueryConversationParams())
    ); // successful append
    context.elasticAssistant.getCurrentUser.mockReturnValue(mockUser1);

    appendConversationMessageRoute(server.router);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getAppendConversationMessageRequest('04128c15-0d1b-4716-a4c5-46997ac7f3bd'),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns 404 when append to a conversation that does not exist', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
        null
      );

      const response = await server.inject(
        getAppendConversationMessageRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'conversation id: "04128c15-0d1b-4716-a4c5-46997ac7f3bd" not found',
        status_code: 404,
      });
    });

    test('catches error if search throws error', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockImplementation(
        async () => {
          throw new Error('Test error');
        }
      );
      const response = await server.inject(
        getAppendConversationMessageRequest(),
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
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID_MESSAGES,
        body: {
          ...getAppendConversationMessagesSchemaMock(),
          id: undefined,
        },
      });
      const response = await server.validate(noIdRequest);
      expect(response.badRequest).toHaveBeenCalled();
    });

    test('allows messages only', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID_MESSAGES,
        body: {
          ...getAppendConversationMessagesSchemaMock(),
          apiConfig: {
            defaultSystemPromptId: 'test',
          },
        },
        params: { id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd' },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid message "role" value', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID_MESSAGES,
        body: {
          ...getUpdateConversationSchemaMock(),
          messages: [
            {
              role: 'invalid',
              content: 'test',
              timestamp: '2019-12-13T16:40:33.400Z',
            },
          ],
        },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith(
        `messages.0.role: Invalid enum value. Expected 'system' | 'user' | 'assistant', received 'invalid'`
      );
    });
  });
});
