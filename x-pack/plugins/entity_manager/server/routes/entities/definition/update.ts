/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createEntityDefinitionQuerySchema,
  entityDefinitionUpdateSchema,
} from '@kbn/entities-schema';
import { z } from '@kbn/zod';
import { EntitySecurityException } from '../../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../../lib/entities/errors/invalid_transform_error';
import { findEntityDefinitionById } from '../../../lib/entities/find_entity_definition';
import { startTransforms } from '../../../lib/entities/start_transforms';
import {
  installationInProgress,
  reinstallEntityDefinition,
} from '../../../lib/entities/install_entity_definition';

import { createEntityManagerServerRoute } from '../../create_entity_manager_server_route';

/**
 * @openapi
 * /internal/entities/definition:
 *   patch:
 *     description: Update an entity definition.
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
    query: createEntityDefinitionQuerySchema,
    body: entityDefinitionUpdateSchema,
  }),
  handler: async ({ context, response, params, logger }) => {
    const core = await context.core;
    const soClient = core.savedObjects.client;
    const esClient = core.elasticsearch.client.asCurrentUser;

    try {
      const installedDefinition = await findEntityDefinitionById({
        soClient,
        esClient,
        id: params.path.id,
      });

      if (!installedDefinition) {
        return response.notFound({
          body: { message: `Entity definition [${params.path.id}] not found` },
        });
      }

      if (installedDefinition.managed) {
        return response.forbidden({
          body: { message: `Managed definition cannot be modified` },
        });
      }

      if (installationInProgress(installedDefinition)) {
        return response.conflict({
          body: { message: `Entity definition [${params.path.id}] has changes in progress` },
        });
      }

      const updatedDefinition = await reinstallEntityDefinition({
        soClient,
        esClient,
        logger,
        definition: installedDefinition,
        definitionUpdate: params.body,
      });

      if (!params.query.installOnly) {
        await startTransforms(esClient, updatedDefinition, logger);
      }

      return response.ok({ body: updatedDefinition });
    } catch (e) {
      logger.error(e);

      if (e instanceof EntitySecurityException || e instanceof InvalidTransformError) {
        return response.customError({ body: e, statusCode: 400 });
      }
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
