/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { SetupRouteOptions } from '../types';
import { EntitySecurityException } from '../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../lib/entities/errors/invalid_transform_error';
import { readEntityDefinition } from '../../lib/entities/read_entity_definition';
import { stopAndDeleteTransform } from '../../lib/entities/stop_and_delete_transform';
import { deleteIngestPipeline } from '../../lib/entities/delete_ingest_pipeline';
import { deleteIndex } from '../../lib/entities/delete_index';
import { createAndInstallIngestPipeline } from '../../lib/entities/create_and_install_ingest_pipeline';
import { createAndInstallTransform } from '../../lib/entities/create_and_install_transform';
import { startTransform } from '../../lib/entities/start_transform';
import { EntityDefinitionNotFound } from '../../lib/entities/errors/entity_not_found';
import { ENTITY_API_PREFIX } from '../../../common/constants_entities';

export function resetEntityDefinitionRoute<T extends RequestHandlerContext>({
  router,
  logger,
  spaces,
}: SetupRouteOptions<T>) {
  router.post<{ id: string }, unknown, unknown>(
    {
      path: `${ENTITY_API_PREFIX}/definition/{id}/_reset`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, req, res) => {
      try {
        const soClient = (await context.core).savedObjects.client;
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const spaceId = spaces?.spacesService.getSpaceId(req) ?? 'default';

        const definition = await readEntityDefinition(soClient, req.params.id, logger);

        // Delete the transform and ingest pipeline
        await stopAndDeleteTransform(esClient, definition, logger);
        await deleteIngestPipeline(esClient, definition, logger);
        await deleteIndex(esClient, definition, logger);

        // Recreate everything
        await createAndInstallIngestPipeline(esClient, definition, logger, spaceId);
        await createAndInstallTransform(esClient, definition, logger);
        await startTransform(esClient, definition, logger);

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
