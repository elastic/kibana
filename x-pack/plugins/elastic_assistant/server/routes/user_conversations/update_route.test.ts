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
import { authenticatedUser } from '../../__mocks__/user';
import { updateConversationRoute } from './update_route';

describe('Update conversation route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const mockUser1 = authenticatedUser;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
      getConversationMock(getQueryConversationParams())
    );
    clients.elasticAssistant.getAIAssistantConversationsDataClient.updateConversation.mockResolvedValue(
      getConversationMock(getQueryConversationParams())
    ); // successful update

    context.elasticAssistant.getCurrentUser.mockReturnValue(mockUser1);
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

    test('returns 404 when updating a single conversation that does not exist', async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.getConversation.mockResolvedValue(
        null
      );

      const response = await server.inject(
        getUpdateConversationRequest(),
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
      const response = await server.validate(noIdRequest);
      expect(response.badRequest).toHaveBeenCalled();
    });

    test('rejects isDefault update', async () => {
      const request = requestMock.create({
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        body: { ...getUpdateConversationSchemaMock(), isDefault: false },
      });
      const result = await server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('allows title, excludeFromLastConversationStorage, apiConfig, replacements and message', async () => {
      const request = requestMock.create({
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
        body: {
          title: 'test2',
          excludeFromLastConversationStorage: true,
          ...getUpdateConversationSchemaMock(),
          apiConfig: {
            actionTypeId: '.bedrock',
            connectorId: '123',
            defaultSystemPromptId: 'test',
          },
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid message "role" value', async () => {
      const request = requestMock.create({
        method: 'put',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
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
