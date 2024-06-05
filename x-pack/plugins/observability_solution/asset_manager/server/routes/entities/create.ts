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
import {
  createAndInstallHistoryIngestPipeline,
  createAndInstallLatestIngestPipeline,
} from '../../lib/entities/create_and_install_ingest_pipeline';
import { EntityIdConflict } from '../../lib/entities/errors/entity_id_conflict_error';
import { EntitySecurityException } from '../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../lib/entities/errors/invalid_transform_error';
import { startTransform } from '../../lib/entities/start_transform';
import { deleteEntityDefinition } from '../../lib/entities/delete_entity_definition';
import {
  deleteHistoryIngestPipeline,
  deleteLatestIngestPipeline,
} from '../../lib/entities/delete_ingest_pipeline';
import {
  stopAndDeleteHistoryTransform,
  stopAndDeleteLatestTransform,
} from '../../lib/entities/stop_and_delete_transform';
import { ENTITY_INTERNAL_API_PREFIX } from '../../../common/constants_entities';
import {
  createAndInstallHistoryTransform,
  createAndInstallLatestTransform,
} from '../../lib/entities/create_and_install_transform';

export function createEntityDefinitionRoute<T extends RequestHandlerContext>({
  router,
  logger,
  spaces,
}: SetupRouteOptions<T>) {
  router.post<unknown, unknown, EntityDefinition>(
    {
      path: `${ENTITY_INTERNAL_API_PREFIX}/definition`,
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
      const installState = {
        ingestPipelines: {
          history: false,
          latest: false,
        },
        transforms: {
          history: false,
          latest: false,
        },
        definition: false,
      };
      const core = await context.core;
      const soClient = core.savedObjects.client;
      const esClient = core.elasticsearch.client.asCurrentUser;
      const spaceId = spaces?.spacesService.getSpaceId(req) ?? 'default';
      try {
        const definition = await saveEntityDefinition(soClient, req.body);
        installState.definition = true;

        // install ingest pipelines
        await createAndInstallHistoryIngestPipeline(esClient, definition, logger, spaceId);
        installState.ingestPipelines.history = true;
        await createAndInstallLatestIngestPipeline(esClient, definition, logger, spaceId);
        installState.ingestPipelines.latest = true;

        // install transfroms
        await createAndInstallHistoryTransform(esClient, definition, logger);
        installState.transforms.history = true;
        await createAndInstallLatestTransform(esClient, definition, logger);
        installState.transforms.latest = true;

        await startTransform(esClient, definition, logger);

        return res.ok({ body: definition });
      } catch (e) {
        // Clean up anything that was successful.
        if (installState.definition) {
          await deleteEntityDefinition(soClient, req.body, logger);
        }

        if (installState.ingestPipelines.history) {
          await deleteHistoryIngestPipeline(esClient, req.body, logger);
        }
        if (installState.ingestPipelines.latest) {
          await deleteLatestIngestPipeline(esClient, req.body, logger);
        }

        if (installState.transforms.history) {
          await stopAndDeleteHistoryTransform(esClient, req.body, logger);
        }
        if (installState.transforms.latest) {
          await stopAndDeleteLatestTransform(esClient, req.body, logger);
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
