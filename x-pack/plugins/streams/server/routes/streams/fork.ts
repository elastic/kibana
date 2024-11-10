/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  DefinitionNotFound,
  ForkConditionMissing,
  IndexTemplateNotFound,
  SecurityException,
} from '../../lib/streams/errors';
import { createServerRoute } from '../create_server_route';
import { streamDefinitonSchema } from '../../../common/types';
import { bootstrapStream } from '../../lib/streams/bootstrap_stream';
import { createStream, readStream } from '../../lib/streams/stream_crud';
import { MalformedStreamId } from '../../lib/streams/errors/malformed_stream_id';

export const forkStreamsRoute = createServerRoute({
  endpoint: 'POST /api/streams/{id}/_fork 2023-10-31',
  options: {
    access: 'public',
    security: {
      authz: {
        requiredPrivileges: ['streams_fork'],
      },
    },
  },
  params: z.object({
    path: z.object({
      id: z.string(),
    }),
    body: streamDefinitonSchema,
  }),
  handler: async ({ response, params, logger, request, getScopedClients }) => {
    try {
      if (!params.body.condition) {
        throw new ForkConditionMissing('You must provide a condition to fork a stream');
      }

      const { scopedClusterClient } = await getScopedClients({ request });

      const { definition: rootDefinition } = await readStream({
        scopedClusterClient,
        id: params.path.id,
        logger,
      });

      if (!params.body.id.startsWith(rootDefinition.id)) {
        throw new MalformedStreamId(
          `The ID (${params.body.id}) from the new stream must start with the parent's id (${rootDefinition.id})`
        );
      }

      await createStream({
        scopedClusterClient,
        definition: { ...params.body, forked_from: rootDefinition.id, root: false },
        logger,
      });

      await bootstrapStream({
        scopedClusterClient,
        definition: params.body,
        rootDefinition,
        logger,
      });

      return response.ok({ body: { acknowledged: true } });
    } catch (e) {
      if (e instanceof IndexTemplateNotFound || e instanceof DefinitionNotFound) {
        return response.notFound({ body: e });
      }

      if (
        e instanceof SecurityException ||
        e instanceof ForkConditionMissing ||
        e instanceof MalformedStreamId
      ) {
        return response.customError({ body: e, statusCode: 400 });
      }

      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
