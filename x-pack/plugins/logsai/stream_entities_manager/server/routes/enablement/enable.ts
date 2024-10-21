/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { BUILT_IN_API_KEY_ID } from '../../../common/constants';
import { APIKeyServiceDisabled, SecurityException } from '../../lib/api/errors';
import { setupApiKeys } from '../../lib/auth/setup_api_keys';
import { createServerRoute } from '../create_server_route';
import { builtInApiScraperDefinitions, installBuiltInDefinitions } from '../../lib/api/built_ins';
import { bootstrapRootEntity } from '../../lib/stream_entities/bootstrap_root_assets';
import { createStreamEntity } from '../../lib/stream_entities/stream_entity_crud';
import { rootStreamEntityDefinition } from '../../lib/stream_entities/root_stream_entity_definition';
import { getClientsFromAPIKey } from '../../lib/utils';

export const enableStreamEntitiesRoute = createServerRoute({
  endpoint: 'POST /internal/streamEntities/_enable',
  params: z.object({}),
  handler: async ({ context, request, response, logger, server, getScopedClients, tasks }) => {
    try {
      const { scopedClusterClient, soClient } = await getScopedClients({ request });
      const apiKey = await setupApiKeys(
        context,
        request,
        server,
        builtInApiScraperDefinitions.map((def) => def.id),
        BUILT_IN_API_KEY_ID
      );

      const definitions = await installBuiltInDefinitions({
        scopedClusterClient,
        soClient,
        logger,
      });

      await Promise.all(
        definitions.map((defintion) => tasks.apiScraperTask.start(defintion, server))
      );

      const apiKeyClients = getClientsFromAPIKey({ server, apiKey });
      await bootstrapRootEntity({
        esClient: apiKeyClients.scopedClusterClient.asSecondaryAuthUser,
        logger,
      });
      await createStreamEntity({
        scopedClusterClient: apiKeyClients.scopedClusterClient,
        definition: rootStreamEntityDefinition,
      });

      return response.ok({ body: { acknowledged: true, definitions } });
    } catch (e) {
      if (e instanceof APIKeyServiceDisabled) {
        return response.badRequest({ body: e });
      }

      if (e instanceof SecurityException) {
        return response.customError({ body: e, statusCode: 400 });
      }

      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
