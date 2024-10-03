/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deleteEntityDefinitionParamsSchema,
  deleteEntityDefinitionQuerySchema,
} from '@kbn/entities-schema';
import { z } from '@kbn/zod';
import { EntityDefinitionNotFound } from '../../../../lib/entities/errors/entity_not_found';
import { EntitySecurityException } from '../../../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../../../lib/entities/errors/invalid_transform_error';
import { createEntityManagerServerRoute } from '../../../create_entity_manager_server_route';
import { findApiEntityDefinitionById } from '../../../../lib/entities/find_entity_definition';
import { deleteApiEntityDefinition } from '../../../../lib/entities/delete_entity_definition';
import { generateInstanceIndexName } from '../../../../lib/entities/helpers/generate_component_id';

export const deleteEntityApiDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'DELETE /internal/entities/api/definition/{id}',
  params: z.object({
    path: deleteEntityDefinitionParamsSchema,
    query: deleteEntityDefinitionQuerySchema,
  }),
  handler: async ({ request, response, params, logger, getScopedClients, tasks }) => {
    try {
      const { scopedClusterClient, soClient } = await getScopedClients({ request });
      const definition = await findApiEntityDefinitionById({ id: params.path.id, soClient });
      await deleteApiEntityDefinition(soClient, definition);
      await tasks.entityElasticsearchApiTask.stop(definition);

      if (params.query.deleteData) {
        await scopedClusterClient.asCurrentUser.indices.delete({
          index: generateInstanceIndexName(definition),
        });
      }

      return response.ok({ body: { acknowledged: true } });
    } catch (e) {
      logger.error(e);

      if (e instanceof EntityDefinitionNotFound) {
        return response.notFound({ body: e });
      }
      if (e instanceof EntitySecurityException || e instanceof InvalidTransformError) {
        return response.customError({ body: e, statusCode: 400 });
      }
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
