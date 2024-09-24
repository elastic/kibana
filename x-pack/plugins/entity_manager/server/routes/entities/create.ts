/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEntityDefinitionQuerySchema, entityDefinitionSchema } from '@kbn/entities-schema';
import { z } from '@kbn/zod';
import { EntityDefinitionIdInvalid } from '../../lib/entities/errors/entity_definition_id_invalid';
import { EntityIdConflict } from '../../lib/entities/errors/entity_id_conflict_error';
import { EntitySecurityException } from '../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../lib/entities/errors/invalid_transform_error';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';

/**
 * @openapi
 * /internal/entities/definition:
 *   post:
 *     description: Install an entity definition.
 *     tags:
 *       - definitions
 *     parameters:
 *       - in: query
 *         name: installOnly
 *         description: If true, the definition transforms will not be started
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *     requestBody:
 *       description: The entity definition to install
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/entityDefinitionSchema'
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/entityDefinitionSchema'
 *       409:
 *         description: An entity definition with this ID already exists
 *       400:
 *         description: The entity definition cannot be installed; see the error for more details but commonly due to validation failures of the definition ID or metrics format
 */
export const createEntityDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/definition',
  params: z.object({
    query: createEntityDefinitionQuerySchema,
    body: entityDefinitionSchema,
  }),
  handler: async ({ request, response, params, logger, getScopedClient }) => {
    try {
      const client = await getScopedClient({ request });
      const definition = await client.createEntityDefinition({
        definition: params.body,
        installOnly: params.query.installOnly,
      });

      return response.ok({ body: definition });
    } catch (e) {
      logger.error(e);

      if (e instanceof EntityDefinitionIdInvalid) {
        return response.badRequest({ body: e });
      }

      if (e instanceof EntityIdConflict) {
        return response.conflict({ body: e });
      }

      if (e instanceof EntitySecurityException || e instanceof InvalidTransformError) {
        return response.customError({ body: e, statusCode: 400 });
      }

      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
