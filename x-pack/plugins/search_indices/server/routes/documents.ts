/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import { INDEX_DOCUMENT_ROUTE } from '../../common/routes';
import { deleteDocument } from '../lib/documents';

export function registerDocumentRoutes(router: IRouter, logger: Logger) {
  router.delete(
    {
      path: INDEX_DOCUMENT_ROUTE,
      validate: {
        params: schema.object({
          indexName: schema.string(),
          id: schema.string(),
        }),
      },
      options: {
        access: 'internal',
      },
    },
    async (context, request, response) => {
      const core = await context.core;
      const client = core.elasticsearch.client.asCurrentUser;

      const { indexName, id } = request.params;

      try {
        await deleteDocument(client, logger, indexName, id);
        return response.ok();
      } catch (e) {
        return response.customError({
          statusCode: e?.meta && e.meta?.statusCode ? e.meta?.statusCode : 500,
          body: {
            message: i18n.translate('xpack.searchIndices.server.deleteDocument.errorMessage', {
              defaultMessage: 'Failed to delete document',
            }),
          },
        });
      }
    }
  );
}
