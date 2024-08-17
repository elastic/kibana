/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { RequestHandlerContext } from '@kbn/core/server';
import {
  createEntityDefinitionQuerySchema,
  CreateEntityDefinitionQuery,
  entityDefinitionUpdateSchema,
  EntityDefinitionUpdate,
} from '@kbn/entities-schema';
import { SetupRouteOptions } from '../types';
import { EntitySecurityException } from '../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../lib/entities/errors/invalid_transform_error';
import { startTransform } from '../../lib/entities/start_transform';
import {
  installationInProgress,
  reinstallEntityDefinition,
} from '../../lib/entities/install_entity_definition';
import { findEntityDefinitionById } from '../../lib/entities/find_entity_definition';

export function updateEntityDefinitionRoute<T extends RequestHandlerContext>({
  router,
  server,
}: SetupRouteOptions<T>) {
  router.put<{ id: string }, CreateEntityDefinitionQuery, EntityDefinitionUpdate>(
    {
      path: '/internal/entities/definition/{id}',
      validate: {
        body: entityDefinitionUpdateSchema.strict(),
        query: createEntityDefinitionQuerySchema,
        params: z.object({ id: z.string() }),
      },
    },
    async (context, req, res) => {
      const { logger } = server;
      const core = await context.core;
      const soClient = core.savedObjects.client;
      const esClient = core.elasticsearch.client.asCurrentUser;

      try {
        const installedDefinition = await findEntityDefinitionById({
          soClient,
          esClient,
          id: req.params.id,
        });

        if (!installedDefinition) {
          return res.notFound({
            body: { message: `Entity definition [${req.params.id}] not found` },
          });
        }

        if (installedDefinition.managed) {
          return res.forbidden({
            body: { message: `Managed definition can't be upgraded` },
          });
        }

        if (installationInProgress(installedDefinition)) {
          return res.conflict({
            body: { message: `Entity definition [${req.params.id}] is being installed` },
          });
        }

        const updatedDefinition = await reinstallEntityDefinition({
          soClient,
          esClient,
          logger,
          definition: installedDefinition,
          definitionUpdate: req.body,
        });

        if (!req.query.installOnly) {
          await startTransform(esClient, updatedDefinition, logger);
        }

        return res.ok({ body: updatedDefinition });
      } catch (e) {
        logger.error(e);

        if (e instanceof EntitySecurityException || e instanceof InvalidTransformError) {
          return res.customError({ body: e, statusCode: 400 });
        }
        return res.customError({ body: e, statusCode: 500 });
      }
    }
  );
}
