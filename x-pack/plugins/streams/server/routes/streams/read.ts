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
import { readAncestors, readStream } from '../../lib/streams/stream_crud';
import { StreamDefinition } from '../../../common';

export const readStreamRoute = createServerRoute({
  endpoint: 'GET /api/streams/{id}',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
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
  }): Promise<
    StreamDefinition & {
      inheritedFields: Array<StreamDefinition['fields'][number] & { from: string }>;
    }
  > => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });
      const streamEntity = await readStream({
        scopedClusterClient,
        id: params.path.id,
      });

      const { ancestors } = await readAncestors({
        id: streamEntity.definition.id,
        scopedClusterClient,
      });

      const body = {
        ...streamEntity.definition,
        inheritedFields: ancestors.flatMap(({ definition: { id, fields } }) =>
          fields.map((field) => ({ ...field, from: id }))
        ),
      };

      return body;
    } catch (e) {
      if (e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      throw internal(e);
    }
  },
});
