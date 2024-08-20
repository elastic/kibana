/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import {
  EntityDefinition,
  entityDefinitionSchema,
  createEntityDefinitionQuerySchema,
  CreateEntityDefinitionQuery,
} from '@kbn/entities-schema';
import { SetupRouteOptions } from '../types';
import { EntityIdConflict } from '../../lib/entities/errors/entity_id_conflict_error';
import { EntitySecurityException } from '../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../lib/entities/errors/invalid_transform_error';
import { startTransform } from '../../lib/entities/start_transform';
import { installEntityDefinition } from '../../lib/entities/install_entity_definition';
import { EntityDefinitionIdInvalid } from '../../lib/entities/errors/entity_definition_id_invalid';

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
export function createEntityDefinitionRoute<T extends RequestHandlerContext>({
  router,
  server,
}: SetupRouteOptions<T>) {
  router.post<unknown, CreateEntityDefinitionQuery, EntityDefinition>(
    {
      path: '/internal/entities/definition',
      validate: {
        body: entityDefinitionSchema.strict(),
        query: createEntityDefinitionQuerySchema,
      },
    },
    async (context, req, res) => {
      const { logger } = server;
      const core = await context.core;
      const soClient = core.savedObjects.client;
      const esClient = core.elasticsearch.client.asCurrentUser;

      try {
        const definition = await installEntityDefinition({
          soClient,
          esClient,
          logger,
          definition: req.body,
        });

        if (!req.query.installOnly) {
          await startTransform(esClient, definition, logger);
        }

        return res.ok({ body: definition });
      } catch (e) {
        logger.error(e);

        if (e instanceof EntityDefinitionIdInvalid) {
          return res.badRequest({ body: e });
        }

        if (e instanceof EntityIdConflict) {
          return res.conflict({ body: e });
        }

        if (e instanceof EntitySecurityException || e instanceof InvalidTransformError) {
          return res.customError({ body: e, statusCode: 400 });
        }

        return res.customError({ body: e, statusCode: 500 });
      }
    }
  );
}
