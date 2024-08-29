/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEntityDefinitionQuerySchema, entityDefinitionSchema } from '@kbn/entities-schema';
import { z } from '@kbn/zod';
import { EntityIdConflict } from '../../lib/entities/errors/entity_id_conflict_error';
import { EntitySecurityException } from '../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../lib/entities/errors/invalid_transform_error';
import { installEntityDefinition } from '../../lib/entities/install_entity_definition';
import { startTransform } from '../../lib/entities/start_transform';
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
 *         description: The entity definition cannot be installed; see the error for more details
 */
export const createEntityDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/definition',
  params: z.object({
    body: entityDefinitionSchema,
    query: createEntityDefinitionQuerySchema,
  }),

  handler: async ({ context, params, response, logger }) => {
    const core = await context.core;
    const soClient = core.savedObjects.client;
    const esClient = core.elasticsearch.client.asCurrentUser;
    try {
      const definition = await installEntityDefinition({
        soClient,
        esClient,
        logger,
        definition: params.body,
      });

      if (!params.query.installOnly) {
        await startTransform(esClient, definition, logger);
      }

      return response.ok({ body: definition });
    } catch (e) {
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
