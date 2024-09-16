/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKnowledgeBaseStatusRoute } from './get_knowledge_base_status';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getGetKnowledgeBaseStatusRequest } from '../../__mocks__/request';
import { AuthenticatedUser } from '@kbn/core-security-common';

describe('Get Knowledge Base Status Route', () => {
  let server: ReturnType<typeof serverMock.create>;

  let { context } = requestContextMock.createTools();

  const mockUser = {
    username: 'my_username',
    authentication_realm: {
      type: 'my_realm_type',
      name: 'my_realm_name',
    },
  } as AuthenticatedUser;

  beforeEach(() => {
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    context.elasticAssistant.getCurrentUser.mockReturnValue(mockUser);
    context.elasticAssistant.getAIAssistantKnowledgeBaseDataClient = jest.fn().mockResolvedValue({
      getKnowledgeBaseDocuments: jest.fn().mockResolvedValue([]),
      indexTemplateAndPattern: {
        alias: 'knowledge-base-alias',
      },
      isModelInstalled: jest.fn().mockResolvedValue(true),
      isSetupAvailable: jest.fn().mockResolvedValue(true),
    });

    getKnowledgeBaseStatusRoute(server.router);
  });

  describe('Status codes', () => {
    test('returns 200 if all statuses are false', async () => {
      const response = await server.inject(
        getGetKnowledgeBaseStatusRequest('esql'),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });
  });
});
