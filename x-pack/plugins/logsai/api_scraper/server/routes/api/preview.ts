/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { JsonObject } from '@kbn/utility-types';
import { ApiDefinitionNotFound } from '../../lib/api/errors/api_scraper_not_found';
import { createDocsFromApiDefinition } from '../../lib/api/tasks/lib/create_docs_from_api_definition';
import { createApiScraperServerRoute } from '../create_api_scraper_server_route';
import { apiScraperDefinitionSchema } from '../../../common/types';

export const previewApiDefinitionRoute = createApiScraperServerRoute({
  endpoint: 'POST /internal/api-scraper/definition/_preview',
  params: z.object({
    body: apiScraperDefinitionSchema,
  }),
  handler: async ({ request, response, params, logger, getScopedClients }) => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });
      const docs = await createDocsFromApiDefinition(
        scopedClusterClient.asCurrentUser,
        params.body
      );

      return response.ok({
        body: {
          docs: docs.map((doc: JsonObject) => ({
            ...doc,
            event: { ingested: new Date().toISOString() },
          })),
        },
      });
    } catch (e) {
      logger.error(e);

      if (e instanceof ApiDefinitionNotFound) {
        return response.notFound({ body: e });
      }
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
