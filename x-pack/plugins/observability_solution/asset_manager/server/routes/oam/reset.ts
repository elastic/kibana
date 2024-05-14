/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { SetupRouteOptions } from '../types';
import { OAMSecurityException } from '../../lib/oam/errors/oam_security_exception';
import { InvalidTransformError } from '../../lib/oam/errors/invalid_transform_error';
import { readOAMDefinition } from '../../lib/oam/read_oam_definition';
import { stopAndDeleteTransform } from '../../lib/oam/stop_and_delete_transform';
import { deleteIngestPipeline } from '../../lib/oam/delete_ingest_pipeline';
import { deleteIndex } from '../../lib/oam/delete_index';
import { createAndInstallIngestPipeline } from '../../lib/oam/create_and_install_ingest_pipeline';
import { createAndInstallTransform } from '../../lib/oam/create_and_install_transform';
import { startTransform } from '../../lib/oam/start_transform';
import { OAMDefinitionNotFound } from '../../lib/oam/errors/oam_not_found';
import { OAM_API_PREFIX } from '../../../common/constants_oam';

export function resetOAMDefinitionRoute<T extends RequestHandlerContext>({
  router,
  logger,
}: SetupRouteOptions<T>) {
  router.post<{ id: string }, unknown, unknown>(
    {
      path: `${OAM_API_PREFIX}/definition/{id}/_reset`,
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

        const definition = await readOAMDefinition(soClient, req.params.id, logger);

        // Delete the transform and ingest pipeline
        await stopAndDeleteTransform(esClient, definition, logger);
        await deleteIngestPipeline(esClient, definition, logger);
        await deleteIndex(esClient, definition, logger);

        // Recreate everything
        await createAndInstallIngestPipeline(esClient, definition, logger);
        await createAndInstallTransform(esClient, definition, logger);
        await startTransform(esClient, definition, logger);

        return res.ok({ body: { acknowledged: true } });
      } catch (e) {
        if (e instanceof OAMDefinitionNotFound) {
          return res.notFound({ body: e });
        }
        if (e instanceof OAMSecurityException || e instanceof InvalidTransformError) {
          return res.customError({ body: e, statusCode: 400 });
        }
        return res.customError({ body: e, statusCode: 500 });
      }
    }
  );
}
