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

import { POST_CREATE_INDEX_ROUTE } from '../../common/routes';
import { CreateIndexRequest } from '../../common/types';
import { createIndex } from '../lib/indices';

export function registerIndicesRoutes(router: IRouter, logger: Logger) {
  router.post(
    {
      path: POST_CREATE_INDEX_ROUTE,
      validate: {
        body: schema.object({
          indexName: schema.string(),
        }),
      },
      options: {
        access: 'internal',
      },
    },
    async (context, request, response) => {
      const core = await context.core;
      const client = core.elasticsearch.client.asCurrentUser;
      const data: CreateIndexRequest = request.body;

      try {
        const body = await createIndex(client, logger, data);
        return response.ok({
          body,
          headers: { 'content-type': 'application/json' },
        });
      } catch (e) {
        switch (e?.meta?.body?.error?.type) {
          case 'resource_already_exists_exception':
            return response.conflict({
              body: {
                message: e.message,
              },
            });
        }

        return response.customError({
          statusCode: e?.meta && e.meta?.statusCode ? e.meta?.statusCode : 500,
          body: {
            message: i18n.translate('xpack.searchIndices.server.createIndex.errorMessage', {
              defaultMessage: 'Failed to create index due to an exception.\n{errorMessage}',
              values: {
                errorMessage: e.message,
              },
            }),
          },
        });
      }
    }
  );
}
