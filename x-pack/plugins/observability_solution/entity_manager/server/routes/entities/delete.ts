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
import { EntityDefinitionNotFound } from '../../lib/entities/errors/entity_not_found';
import { EntitySecurityException } from '../../lib/entities/errors/entity_security_exception';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';
import { UnexpectedEntityManagerError } from '../../lib/errors';

/**
 * @openapi
 * /internal/entities/definitions:
 *   delete:
 *     description: Uninstall an entity definition. This stops and deletes the transforms, ingest pipelines, definitions saved objects, and index templates for this entity definition.
 *     tags:
 *       - definitions
 *     parameters:
 *       - in: path
 *         name: id
 *         description: The entity definition ID
 *         schema:
 *           $ref: '#/components/schemas/deleteEntityDefinitionParamsSchema/properties/id'
 *         required: true
 *       - in: query
 *         name: deleteData
 *         description: If true, delete all entity data in the indices associated with this entity definition
 *         schema:
 *           $ref: '#/components/schemas/deleteEntityDefinitionQuerySchema/properties/deleteData'
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 acknowledged:
 *                   type: boolean
 *       403:
 *         description: Entity definition with given ID not found
 *       404:
 *         description: The user does not have the permissions to delete this definition
 *       400:
 *         description: The entity definition cannot be removed; see the error for more details
 */
export const deleteEntityDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'DELETE /internal/entities/definitions/{id}',
  params: z.object({
    path: deleteEntityDefinitionParamsSchema,
    query: deleteEntityDefinitionQuerySchema,
  }),
  handler: async ({ request, response, params, logger, getScopedClient }) => {
    try {
      const client = await getScopedClient({ request });
      await client.deleteEntityDefinition({
        id: params.path.id,
        deleteData: params.query.deleteData,
      });

      return response.ok({ body: { acknowledged: true } });
    } catch (e) {
      logger.error(e);

      if (e instanceof EntityDefinitionNotFound) {
        return response.notFound({ body: e });
      }

      if (e instanceof EntitySecurityException) {
        return response.forbidden({
          body: {
            message:
              'Current Kibana user does not have the required permissions to delete this definition',
          },
        });
      }

      return response.customError({ body: new UnexpectedEntityManagerError(e), statusCode: 500 });
    }
  },
});
