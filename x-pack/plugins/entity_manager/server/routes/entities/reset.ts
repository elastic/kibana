/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resetEntityDefinitionParamsSchema } from '@kbn/entities-schema';
import { z } from '@kbn/zod';

import { EntitySecurityException } from '../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../lib/entities/errors/invalid_transform_error';
import { readEntityDefinition } from '../../lib/entities/read_entity_definition';
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
import { startTransforms } from '../../lib/entities/start_transforms';
import { EntityDefinitionNotFound } from '../../lib/entities/errors/entity_not_found';

import { isBackfillEnabled } from '../../lib/entities/helpers/is_backfill_enabled';

import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';
import { deleteTransforms } from '../../lib/entities/delete_transforms';
import { stopTransforms } from '../../lib/entities/stop_transforms';

export const resetEntityDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/definition/{id}/_reset',
  params: z.object({
    path: resetEntityDefinitionParamsSchema,
  }),
  handler: async ({ context, response, params, logger }) => {
    try {
      const soClient = (await context.core).savedObjects.client;
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;

      const definition = await readEntityDefinition(soClient, params.path.id, logger);

      // Delete the transform and ingest pipeline
      await stopTransforms(esClient, definition, logger);
      await deleteTransforms(esClient, definition, logger);

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
      await startTransforms(esClient, definition, logger);

      return response.ok({ body: { acknowledged: true } });
    } catch (e) {
      logger.error(e);

      if (e instanceof EntityDefinitionNotFound) {
        return response.notFound({ body: e });
      }
      if (e instanceof EntitySecurityException || e instanceof InvalidTransformError) {
        return response.customError({ body: e, statusCode: 400 });
      }
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
