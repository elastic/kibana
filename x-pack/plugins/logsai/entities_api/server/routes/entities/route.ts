/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { EntityWithSignalStatus } from '../../../common';
import { createEntitiesAPIServerRoute } from '../create_entities_api_server_route';

export const getEntitiesRoute = createEntitiesAPIServerRoute({
  endpoint: 'POST /internal/entities_api/entities',
  options: {
    tags: ['access:entities'],
  },
  params: z.object({
    body: z.object({
      start: z.number(),
      end: z.number(),
      kuery: z.string(),
      types: z.array(z.string()),
      sortField: z.string(),
      sortOrder: z.union([z.literal('asc'), z.literal('desc')]),
    }),
  }),
  handler: async (): Promise<{ entities: EntityWithSignalStatus[] }> => {
    return {
      entities: [],
    };
  },
});

export const entitiesRoutes = {
  ...getEntitiesRoute,
};
