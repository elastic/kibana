/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { BooleanFromString } from '@kbn/zod-helpers';
import { DefinitionNotFound, SecurityException } from '../../lib/api/errors';
import { createServerRoute } from '../create_server_route';
import { findDefinitionById } from '../../lib/api/find_definition_by_id';
import { deleteDefinition } from '../../lib/api/delete_definition';

export const deleteApiDefinitionRoute = createServerRoute({
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
      const definition = await findDefinitionById({
        id: params.path.id,
        soClient,
      });
      await deleteDefinition(soClient, definition);
      await tasks.apiScraperTask.stop(definition);

      if (params.query.deleteData) {
        await scopedClusterClient.asCurrentUser.indices.delete({
          index: `.${definition.id}`,
        });
      }

      return response.ok({ body: { acknowledged: true } });
    } catch (e) {
      logger.error(e);

      if (e instanceof DefinitionNotFound) {
        return response.notFound({ body: e });
      }
      if (e instanceof SecurityException) {
        return response.customError({ body: e, statusCode: 400 });
      }
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
