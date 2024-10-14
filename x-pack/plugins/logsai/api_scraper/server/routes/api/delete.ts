/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { BooleanFromString } from '@kbn/zod-helpers';
import { ApiDefinitionNotFound } from '../../lib/api/errors/api_scraper_not_found';
import { ApiScraperSecurityException } from '../../lib/api/errors/api_scraper_security_exception';
import { createApiScraperServerRoute } from '../create_api_scraper_server_route';
import { findApiScraperDefinitionById } from '../../lib/api/find_api_scraper_definition_by_id';
import { deleteApiScraperDefinition } from '../../lib/api/delete_api_scraper_definition';

export const deleteApiDefinitionRoute = createApiScraperServerRoute({
  endpoint: 'DELETE /internal/api-scraper/definition/{id}',
  params: z.object({
    path: z.object({
      id: z.string(),
    }),
    query: z.object({
      deleteData: z.optional(BooleanFromString).default(false),
    }),
  }),
  handler: async ({ request, response, params, logger, getScopedClients, tasks }) => {
    try {
      const { scopedClusterClient, soClient } = await getScopedClients({ request });
      const definition = await findApiScraperDefinitionById({ id: params.path.id, soClient });
      await deleteApiScraperDefinition(soClient, definition);
      await tasks.apiScraperTask.stop(definition);

      if (params.query.deleteData) {
        await scopedClusterClient.asCurrentUser.indices.delete({
          index: `.${definition.id}`,
        });
      }

      return response.ok({ body: { acknowledged: true } });
    } catch (e) {
      logger.error(e);

      if (e instanceof ApiDefinitionNotFound) {
        return response.notFound({ body: e });
      }
      if (e instanceof ApiScraperSecurityException) {
        return response.customError({ body: e, statusCode: 400 });
      }
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
