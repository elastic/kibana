/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinitionUpdateSchema } from '@kbn/entities-schema';
import { z } from '@kbn/zod';
import { EntitySecurityException } from '../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../lib/entities/errors/invalid_transform_error';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';
import { EntityDefinitionNotFound } from '../../lib/entities/errors/entity_not_found';
import { EntityDefinitionUpdateConflict } from '../../lib/entities/errors/entity_definition_update_conflict';

/**
 * @openapi
 * /internal/entities/definition:
 *   patch:
 *     description: Update an entity definition.
 *     tags:
 *       - definitions
 *     parameters:
 *       - in: path
 *         name: id
 *         description: The entity definition ID
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       description: The definition properties to update
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/entityDefinitionUpdateSchema'
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/entityDefinitionSchema'
 *       400:
 *         description: The entity definition cannot be installed; see the error for more details
 *       404:
 *         description: The entity definition does not exist
 *       403:
 *         description: User is not allowed to update the entity definition
 *       409:
 *         description: The entity definition is being updated by another request
 */
export const updateEntityDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'PATCH /internal/entities/definition/{id}',
  params: z.object({
    path: z.object({ id: z.string() }),
    body: entityDefinitionUpdateSchema,
  }),
  handler: async ({ request, response, params, logger, getScopedClient }) => {
    const entityClient = await getScopedClient({ request });

    try {
      const updatedDefinition = await entityClient.updateEntityDefinition({
        id: params.path.id,
        definitionUpdate: params.body,
      });

      return response.ok({ body: updatedDefinition });
    } catch (e) {
      logger.error(e);

      if (e instanceof EntityDefinitionNotFound) {
        return response.notFound({
          body: { message: `Entity definition [${params.path.id}] not found` },
        });
      }

      if (e instanceof EntityDefinitionUpdateConflict) {
        return response.conflict({
          body: { message: `Entity definition [${params.path.id}] has changes in progress` },
        });
      }

      if (e instanceof EntitySecurityException || e instanceof InvalidTransformError) {
        return response.customError({ body: e, statusCode: 400 });
      }

      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
