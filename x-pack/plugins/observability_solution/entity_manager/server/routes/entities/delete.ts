/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  deleteEntityDefinitionParamsSchema,
  deleteEntityDefinitionQuerySchema,
} from '@kbn/entities-schema';
import { SetupRouteOptions } from '../types';
import { EntitySecurityException } from '../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../lib/entities/errors/invalid_transform_error';
import { readEntityDefinition } from '../../lib/entities/read_entity_definition';
import { EntityDefinitionNotFound } from '../../lib/entities/errors/entity_not_found';
import { uninstallEntityDefinition } from '../../lib/entities/uninstall_entity_definition';

/**
 * @openapi
 * /internal/entities/definition:
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
 *       400:
 *         description: The entity definition cannot be removed; see the error for more details
 *       404:
 *         description: Entity definition with given ID not found
 */
export function deleteEntityDefinitionRoute<T extends RequestHandlerContext>({
  router,
  server,
}: SetupRouteOptions<T>) {
  router.delete<{ id: string }, { deleteData?: boolean }, unknown>(
    {
      path: '/internal/entities/definition/{id}',
      validate: {
        params: buildRouteValidationWithZod(deleteEntityDefinitionParamsSchema.strict()),
        query: buildRouteValidationWithZod(deleteEntityDefinitionQuerySchema.strict()),
      },
    },
    async (context, req, res) => {
      try {
        const { logger } = server;
        const soClient = (await context.core).savedObjects.client;
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;

        const definition = await readEntityDefinition(soClient, req.params.id, logger);
        await uninstallEntityDefinition({
          definition,
          soClient,
          esClient,
          logger,
          deleteData: req.query.deleteData,
        });

        return res.ok({ body: { acknowledged: true } });
      } catch (e) {
        if (e instanceof EntityDefinitionNotFound) {
          return res.notFound({ body: e });
        }
        if (e instanceof EntitySecurityException || e instanceof InvalidTransformError) {
          return res.customError({ body: e, statusCode: 400 });
        }
        return res.customError({ body: e, statusCode: 500 });
      }
    }
  );
}
