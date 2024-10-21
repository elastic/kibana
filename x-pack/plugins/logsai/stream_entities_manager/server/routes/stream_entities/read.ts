/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createServerRoute } from '../create_server_route';
import { BUILT_IN_API_KEY_ID } from '../../../common/constants';
import { ApiKeyNotFound, DefinitionNotFound } from '../../lib/api/errors';
import { readStreamEntitiesManagerAPIKey } from '../../lib/auth';
import { getClientsFromAPIKey } from '../../lib/utils';
import { readStreamEntity } from '../../lib/stream_entities/stream_entity_crud';

export const readStreamEntitiesRoute = createServerRoute({
  endpoint: 'GET /internal/streamEntities/{id}',
  params: z.object({
    path: z.object({ id: z.string() }),
  }),
  handler: async ({ response, params, logger, server }) => {
    try {
      const apiKey = await readStreamEntitiesManagerAPIKey(server, BUILT_IN_API_KEY_ID);
      if (!apiKey) {
        throw new ApiKeyNotFound(
          `Unable to find ApiKey (${BUILT_IN_API_KEY_ID}). Have you enabled Stream Entities?`
        );
      }
      const { scopedClusterClient } = getClientsFromAPIKey({ server, apiKey });

      const streamEntity = await readStreamEntity({
        scopedClusterClient,
        id: params.path.id,
      });

      return response.ok({ body: streamEntity });
    } catch (e) {
      if (e instanceof DefinitionNotFound) {
        return response.notFound({ body: e });
      }
    }
  },
});
