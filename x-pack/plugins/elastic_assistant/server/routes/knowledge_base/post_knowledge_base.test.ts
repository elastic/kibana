/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postKnowledgeBaseRoute } from './post_knowledge_base';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getPostKnowledgeBaseRequest } from '../../__mocks__/request';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { AuthenticatedUser } from '@kbn/core-security-common';

describe('Post Knowledge Base Route', () => {
  let server: ReturnType<typeof serverMock.create>;
  // eslint-disable-next-line prefer-const
  let { clients, context } = requestContextMock.createTools();

  clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();

  const mockGetElser = jest.fn().mockResolvedValue('.elser_model_2');
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
      setupKnowledgeBase: jest.fn(),
      indexTemplateAndPattern: {
        alias: 'knowledge-base-alias',
      },
      isModelInstalled: jest.fn().mockResolvedValue(true),
    });

    postKnowledgeBaseRoute(server.router, mockGetElser);
  });

  describe('Status codes', () => {
    test('returns 200 if base resources are created', async () => {
      const response = await server.inject(
        getPostKnowledgeBaseRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
    });
  });
});
