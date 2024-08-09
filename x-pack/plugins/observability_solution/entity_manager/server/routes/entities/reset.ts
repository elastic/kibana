/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { resetEntityDefinitionParamsSchema } from '@kbn/entities-schema';
import { SetupRouteOptions } from '../types';
import { EntitySecurityException } from '../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../lib/entities/errors/invalid_transform_error';
import { readEntityDefinition } from '../../lib/entities/read_entity_definition';
import {
  stopAndDeleteHistoryBackfillTransform,
  stopAndDeleteHistoryTransform,
  stopAndDeleteLatestTransform,
} from '../../lib/entities/stop_and_delete_transform';
import {
  deleteHistoryIngestPipeline,
  deleteLatestIngestPipeline,
} from '../../lib/entities/delete_ingest_pipeline';
import { deleteIndices } from '../../lib/entities/delete_index';
import {
  createAndInstallHistoryIngestPipeline,
  createAndInstallLatestIngestPipeline,
} from '../../lib/entities/create_and_install_ingest_pipeline';
import {
  createAndInstallHistoryBackfillTransform,
  createAndInstallHistoryTransform,
  createAndInstallLatestTransform,
} from '../../lib/entities/create_and_install_transform';
import { startTransform } from '../../lib/entities/start_transform';
import { EntityDefinitionNotFound } from '../../lib/entities/errors/entity_not_found';
import { isBackfillEnabled } from '../../lib/entities/helpers/is_backfill_enabled';

export function resetEntityDefinitionRoute<T extends RequestHandlerContext>({
  router,
  logger,
}: SetupRouteOptions<T>) {
  router.post<{ id: string }, unknown, unknown>(
    {
      path: '/internal/entities/definition/{id}/_reset',
      validate: {
        params: buildRouteValidationWithZod(resetEntityDefinitionParamsSchema.strict()),
      },
    },
    async (context, req, res) => {
      try {
        const soClient = (await context.core).savedObjects.client;
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;

        const definition = await readEntityDefinition(soClient, req.params.id, logger);

        // Delete the transform and ingest pipeline
        await stopAndDeleteHistoryTransform(esClient, definition, logger);
        if (isBackfillEnabled(definition)) {
          await stopAndDeleteHistoryBackfillTransform(esClient, definition, logger);
        }
        await stopAndDeleteLatestTransform(esClient, definition, logger);
        await deleteHistoryIngestPipeline(esClient, definition, logger);
        await deleteLatestIngestPipeline(esClient, definition, logger);
        await deleteIndices(esClient, definition, logger);

        // Recreate everything
        await createAndInstallHistoryIngestPipeline(esClient, definition, logger);
        await createAndInstallLatestIngestPipeline(esClient, definition, logger);
        await createAndInstallHistoryTransform(esClient, definition, logger);
        if (isBackfillEnabled(definition)) {
          await createAndInstallHistoryBackfillTransform(esClient, definition, logger);
        }
        await createAndInstallLatestTransform(esClient, definition, logger);
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
