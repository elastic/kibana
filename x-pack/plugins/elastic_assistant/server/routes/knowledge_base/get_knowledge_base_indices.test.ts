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
    '.ds-logs-endpoint.alerts-default-2024.10.31-000001',
    '.ds-metrics-endpoint.metadata-default-2024.10.31-000001',
    '.internal.alerts-security.alerts-default-000001',
    'metrics-endpoint.metadata_current_default',
    'semantic-index-1',
    'semantic-index-2',
  ],
  fields: {
    content: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: [
          '.ds-logs-endpoint.alerts-default-2024.10.31-000001',
          '.ds-metrics-endpoint.metadata-default-2024.10.31-000001',
          '.internal.alerts-security.alerts-default-000001',
          'metrics-endpoint.metadata_current_default',
        ],
      },
      semantic_text: {
        type: 'semantic_text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['semantic-index-1', 'semantic-index-2'],
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
        indices: ['semantic-index-1', 'semantic-index-2'],
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
