/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { EntityDefinition, entityDefinitionSchema } from '@kbn/entities-schema';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SetupRouteOptions } from '../types';
import { EntityIdConflict } from '../../lib/entities/errors/entity_id_conflict_error';
import { EntitySecurityException } from '../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../lib/entities/errors/invalid_transform_error';
import { startTransform } from '../../lib/entities/start_transform';
import { installEntityDefinition } from '../../lib/entities/install_entity_definition';

export function createEntityDefinitionRoute<T extends RequestHandlerContext>({
  router,
  server,
}: SetupRouteOptions<T>) {
  router.post<unknown, unknown, EntityDefinition>(
    {
      path: '/internal/entities/definition',
      validate: {
        body: buildRouteValidationWithZod(entityDefinitionSchema.strict()),
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

        await startTransform(esClient, definition, logger);

        return res.ok({ body: definition });
      } catch (e) {
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
