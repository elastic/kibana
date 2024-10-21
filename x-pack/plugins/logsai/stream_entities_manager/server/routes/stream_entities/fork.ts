/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  ApiKeyNotFound,
  DefinitionNotFound,
  ForkConditionMissing,
  IndexTemplateNotFound,
  SecurityException,
} from '../../lib/api/errors';
import { createServerRoute } from '../create_server_route';
import { getClientsFromAPIKey } from '../../lib/utils';
import { streamEntityDefinitonSchema } from '../../../common/types';
import { BUILT_IN_API_KEY_ID } from '../../../common/constants';
import { readStreamEntitiesManagerAPIKey } from '../../lib/auth';
import { bootstrapStreamEntity } from '../../lib/stream_entities/bootstrap_stream_entity';
import { createStreamEntity, readStreamEntity } from '../../lib/stream_entities/stream_entity_crud';

export const forkStreamEntitiesRoute = createServerRoute({
  endpoint: 'POST /internal/streamEntities/{id}/_fork',
  params: z.object({
    path: z.object({
      id: z.string(),
    }),
    body: streamEntityDefinitonSchema,
  }),
  handler: async ({ response, params, logger, server }) => {
    try {
      if (!params.body.condition) {
        throw new ForkConditionMissing('You must provide a condition to fork a StreamEntity');
      }
      const apiKey = await readStreamEntitiesManagerAPIKey(server, BUILT_IN_API_KEY_ID);
      if (!apiKey) {
        throw new ApiKeyNotFound(
          `Unable to find ApiKey (${BUILT_IN_API_KEY_ID}). Have you enabled Stream Entities?`
        );
      }
      const { scopedClusterClient } = getClientsFromAPIKey({ server, apiKey });

      const { definition: rootDefinition } = await readStreamEntity({
        scopedClusterClient,
        id: params.path.id,
      });

      await createStreamEntity({
        scopedClusterClient,
        definition: { ...params.body, forked_from: rootDefinition.id },
      });

      await bootstrapStreamEntity({
        scopedClusterClient,
        definition: params.body,
        rootDefinition,
        logger,
      });

      return response.ok({ body: { acknowledged: true } });
    } catch (e) {
      if (
        e instanceof IndexTemplateNotFound ||
        e instanceof DefinitionNotFound ||
        e instanceof ApiKeyNotFound
      ) {
        return response.notFound({ body: e });
      }

      if (e instanceof SecurityException || e instanceof ForkConditionMissing) {
        return response.customError({ body: e, statusCode: 400 });
      }

      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
