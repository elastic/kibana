/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { OAMDefinition, oamDefinitionSchema } from '@kbn/oam-schema';
import { stringifyZodError } from '@kbn/zod-helpers';
import { SetupRouteOptions } from '../types';
import { saveOAMDefinition } from '../../lib/oam/save_oam_definition';
import { createAndInstallIngestPipeline } from '../../lib/oam/create_and_install_ingest_pipeline';
import { OAMIdConflict } from '../../lib/oam/errors/oam_id_conflict_error';
import { createAndInstallTransform } from '../../lib/oam/create_and_install_transform';
import { OAMSecurityException } from '../../lib/oam/errors/oam_security_exception';
import { InvalidTransformError } from '../../lib/oam/errors/invalid_transform_error';
import { startTransform } from '../../lib/oam/start_transform';
import { deleteOAMDefinition } from '../../lib/oam/delete_oam_definition';
import { deleteIngestPipeline } from '../../lib/oam/delete_ingest_pipeline';
import { stopAndDeleteTransform } from '../../lib/oam/stop_and_delete_transform';

export function createOAMDefinitionRoute<T extends RequestHandlerContext>({
  router,
  logger,
}: SetupRouteOptions<T>) {
  router.post<unknown, unknown, OAMDefinition>(
    {
      path: '/api/oam/definition',
      validate: {
        body: (body, res) => {
          try {
            return res.ok(oamDefinitionSchema.parse(body));
          } catch (e) {
            return res.badRequest(stringifyZodError(e));
          }
        },
      },
    },
    async (context, req, res) => {
      let definitionCreated = false;
      let ingestPipelineCreated = false;
      let transformCreated = false;
      const soClient = (await context.core).savedObjects.client;
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;
      try {
        const definition = await saveOAMDefinition(soClient, req.body);
        definitionCreated = true;
        await createAndInstallIngestPipeline(esClient, definition, logger);
        ingestPipelineCreated = true;
        await createAndInstallTransform(esClient, definition, logger);
        transformCreated = true;
        await startTransform(esClient, definition, logger);

        return res.ok({ body: definition });
      } catch (e) {
        // Clean up anything that was successful.
        if (definitionCreated) {
          await deleteOAMDefinition(soClient, req.body, logger);
        }
        if (ingestPipelineCreated) {
          await deleteIngestPipeline(esClient, req.body, logger);
        }
        if (transformCreated) {
          await stopAndDeleteTransform(esClient, req.body, logger);
        }
        if (e instanceof OAMIdConflict) {
          return res.conflict({ body: e });
        }
        if (e instanceof OAMSecurityException || e instanceof InvalidTransformError) {
          return res.customError({ body: e, statusCode: 400 });
        }
        return res.customError({ body: e, statusCode: 500 });
      }
    }
  );
}
