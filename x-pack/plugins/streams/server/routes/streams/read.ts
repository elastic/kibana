/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { notFound, internal } from '@hapi/boom';
import { createServerRoute } from '../create_server_route';
import { DefinitionNotFound } from '../../lib/streams/errors';
import { readStream } from '../../lib/streams/stream_crud';
import { StreamDefinition } from '../../../common';

export const readStreamRoute = createServerRoute({
  endpoint: 'GET /api/streams/{id} 2023-10-31',
  options: {
    access: 'public',
    security: {
      authz: {
        requiredPrivileges: ['streams_read'],
      },
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
  }),
  handler: async ({
    response,
    params,
    request,
    logger,
    getScopedClients,
  }): Promise<{ definition: StreamDefinition }> => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });
      const streamEntity = await readStream({
        logger,
        scopedClusterClient,
        id: params.path.id,
      });

      return streamEntity;
    } catch (e) {
      if (e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      throw internal(e);
    }
  },
});
