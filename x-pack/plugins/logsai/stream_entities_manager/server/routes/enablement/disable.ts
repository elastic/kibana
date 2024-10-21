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
import { deleteDefinition } from '../../lib/api/delete_definition';
import { builtInApiScraperDefinitions } from '../../lib/api/built_ins';

export const disableStreamEntitiesRoute = createServerRoute({
  endpoint: 'POST /internal/streamEntities/_disable',
  params: z.object({
    query: z.object({
      deleteData: z.optional(BooleanFromString).default(false),
    }),
  }),
  handler: async ({ request, response, params, logger, getScopedClients, tasks }) => {
    try {
      const { scopedClusterClient, soClient } = await getScopedClients({ request });

      await Promise.all(
        builtInApiScraperDefinitions.map(async (definition) => {
          await deleteDefinition(soClient, definition);
          await tasks.apiScraperTask.stop(definition);
          if (params.query.deleteData) {
            await scopedClusterClient.asCurrentUser.indices
              .delete({
                index: `.${definition.id}`,
              })
              .catch((e) => {
                logger.error(`Unable to delete [.${definition.id}] index.`);
              });
          }
        })
      );

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
