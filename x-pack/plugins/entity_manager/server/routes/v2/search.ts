/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';
import { UnknownEntityType } from '../../lib/v2/errors/unknown_entity_type';
import { searchBySourcesRt, searchByTypeRt } from '../../lib/v2/types';
import { READ_ENTITIES_PRIVILEGE } from '../../lib/v2/constants';

export const searchEntitiesRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/v2/_search',
  security: {
    authz: {
      requiredPrivileges: [READ_ENTITIES_PRIVILEGE],
    },
  },
  params: z.object({
    body: searchByTypeRt,
  }),
  handler: async ({ request, response, params, logger, getScopedClient }) => {
    try {
      const client = await getScopedClient({ request });
      const entities = await client.v2.searchEntities(params.body);

      return response.ok({ body: { entities } });
    } catch (e) {
      logger.error(e);

      if (e instanceof UnknownEntityType) {
        return response.notFound({ body: e });
      }

      return response.customError({ body: e, statusCode: 500 });
    }
  },
});

export const searchEntitiesPreviewRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/v2/_search/preview',
  security: {
    authz: {
      requiredPrivileges: [READ_ENTITIES_PRIVILEGE],
    },
  },
  params: z.object({
    body: searchBySourcesRt,
  }),
  handler: async ({ request, response, params, getScopedClient }) => {
    const client = await getScopedClient({ request });
    const entities = await client.v2.searchEntitiesBySources(params.body);

    return response.ok({ body: { entities } });
  },
});

export const searchRoutes = {
  ...searchEntitiesRoute,
  ...searchEntitiesPreviewRoute,
};
