/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKnowledgeBaseIndicesRoute } from './get_knowledge_base_indices';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getGetKnowledgeBaseIndicesRequest } from '../../__mocks__/request';

const mockFieldCaps = {
  indices: [
    '.ds-.items-default-2024.11.12-000001',
    '.ds-.lists-default-2024.11.12-000001',
    '.ds-logs-endpoint.alerts-default-2024.11.12-000001',
    '.ds-logs-endpoint.events.process-default-2024.11.12-000001',
    'gtr-1',
    'gtr-with-bug',
    'gtr-with-semantic-1',
    'metrics-endpoint.metadata_current_default',
    'search-elastic-security-docs',
  ],
  fields: {
    content: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: [
          '.ds-.items-default-2024.11.12-000001',
          '.ds-.lists-default-2024.11.12-000001',
          '.ds-logs-endpoint.alerts-default-2024.11.12-000001',
          '.ds-logs-endpoint.events.process-default-2024.11.12-000001',
          'gtr-1',
          'gtr-with-bug',
          'metrics-endpoint.metadata_current_default',
        ],
      },
      semantic_text: {
        type: 'semantic_text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['gtr-with-semantic-1'],
      },
    },
    ai_embeddings: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: [
          '.ds-.items-default-2024.11.12-000001',
          '.ds-.lists-default-2024.11.12-000001',
          '.ds-logs-endpoint.alerts-default-2024.11.12-000001',
          '.ds-logs-endpoint.events.process-default-2024.11.12-000001',
          'gtr-1',
          'gtr-with-semantic-1',
          'metrics-endpoint.metadata_current_default',
        ],
      },
      semantic_text: {
        type: 'semantic_text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['gtr-with-bug', 'search-elastic-security-docs'],
      },
    },
    semantic_text: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: [
          '.ds-.items-default-2024.11.12-000001',
          '.ds-.lists-default-2024.11.12-000001',
          '.ds-logs-endpoint.alerts-default-2024.11.12-000001',
          '.ds-logs-endpoint.events.process-default-2024.11.12-000001',
          'gtr-1',
          'gtr-with-semantic-1',
          'metrics-endpoint.metadata_current_default',
        ],
      },
      semantic_text: {
        type: 'semantic_text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['search-elastic-security-docs'],
      },
    },
  },
};

describe('Get Knowledge Base Status Route', () => {
  let server: ReturnType<typeof serverMock.create>;

  let { context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    context.core.elasticsearch.client.asCurrentUser.fieldCaps.mockResponse(mockFieldCaps);

    getKnowledgeBaseIndicesRoute(server.router);
  });

  describe('Status codes', () => {
    test('returns 200 and all indices with `semantic_text` type fields', async () => {
      const response = await server.inject(
        getGetKnowledgeBaseIndicesRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        indices: ['gtr-with-bug', 'gtr-with-semantic-1', 'search-elastic-security-docs'],
      });
      expect(context.core.elasticsearch.client.asCurrentUser.fieldCaps).toBeCalledWith({
        index: '*',
        fields: '*',
        types: ['semantic_text'],
        include_unmapped: true,
      });
    });
  });
});
