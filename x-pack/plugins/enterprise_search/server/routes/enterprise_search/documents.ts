/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { getDocument } from '../../lib/indices/document/get_document';
import { RouteDependencies } from '../../plugin';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';

export function registerDocumentRoute({ router, log }: RouteDependencies) {
  router.get(
    {
      path: '/internal/enterprise_search/indices/{index_name}/document/{document_id}',
      validate: {
        params: schema.object({
          document_id: schema.string(),
          index_name: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.index_name);
      const documentId = decodeURIComponent(request.params.document_id);
      const { client } = (await context.core).elasticsearch;

      const documentResponse = await getDocument(client, indexName, documentId);
      return response.ok({
        body: documentResponse,
        headers: { 'content-type': 'application/json' },
      });
    })
  );
}
