/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { EntityDefinition, entityDefinitionSchema } from '@kbn/entities-schema';
import { stringifyZodError } from '@kbn/zod-helpers';
import { SetupRouteOptions } from '../types';
import { saveEntityDefinition } from '../../lib/entities/save_entity_definition';
import { createAndInstallIngestPipeline } from '../../lib/entities/create_and_install_ingest_pipeline';
import { EntityIdConflict } from '../../lib/entities/errors/entity_id_conflict_error';
import { createAndInstallTransform } from '../../lib/entities/create_and_install_transform';
import { EntitySecurityException } from '../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../lib/entities/errors/invalid_transform_error';
import { startTransform } from '../../lib/entities/start_transform';
import { deleteEntityDefinition } from '../../lib/entities/delete_entity_definition';
import { deleteIngestPipeline } from '../../lib/entities/delete_ingest_pipeline';
import { stopAndDeleteTransform } from '../../lib/entities/stop_and_delete_transform';
import { ENTITY_API_PREFIX } from '../../../common/constants_entities';

export function createEntityDefinitionRoute<T extends RequestHandlerContext>({
  router,
  logger,
  spaces,
}: SetupRouteOptions<T>) {
  router.post<unknown, unknown, EntityDefinition>(
    {
      path: `${ENTITY_API_PREFIX}/definition`,
      validate: {
        body: (body, res) => {
          try {
            return res.ok(entityDefinitionSchema.parse(body));
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
      const core = await context.core;
      const soClient = core.savedObjects.client;
      const esClient = core.elasticsearch.client.asCurrentUser;
      const spaceId = spaces?.spacesService.getSpaceId(req) ?? 'default';

      try {
        const definition = await saveEntityDefinition(soClient, req.body);
        definitionCreated = true;
        await createAndInstallIngestPipeline(esClient, definition, logger, spaceId);
        ingestPipelineCreated = true;
        await createAndInstallTransform(esClient, definition, logger);
        transformCreated = true;
        await startTransform(esClient, definition, logger);

        return res.ok({ body: definition });
      } catch (e) {
        // Clean up anything that was successful.
        if (definitionCreated) {
          await deleteEntityDefinition(soClient, req.body, logger);
        }
        if (ingestPipelineCreated) {
          await deleteIngestPipeline(esClient, req.body, logger);
        }
        if (transformCreated) {
          await stopAndDeleteTransform(esClient, req.body, logger);
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
