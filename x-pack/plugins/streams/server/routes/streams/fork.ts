/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { badRequest, internal, notFound } from '@hapi/boom';
import {
  DefinitionNotFound,
  ForkConditionMissing,
  IndexTemplateNotFound,
  SecurityException,
} from '../../lib/streams/errors';
import { createServerRoute } from '../create_server_route';
import { conditionSchema, streamDefinitonWithoutChildrenSchema } from '../../../common/types';
import { syncStream, readStream, validateAncestorFields } from '../../lib/streams/stream_crud';
import { MalformedStreamId } from '../../lib/streams/errors/malformed_stream_id';
import { isChildOf } from '../../lib/streams/helpers/hierarchy';

export const forkStreamsRoute = createServerRoute({
  endpoint: 'POST /api/streams/{id}/_fork',
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
    path: z.object({
      id: z.string(),
    }),
    body: z.object({ stream: streamDefinitonWithoutChildrenSchema, condition: conditionSchema }),
  }),
  handler: async ({
    params,
    logger,
    request,
    getScopedClients,
  }): Promise<{ acknowledged: true }> => {
    try {
      if (!params.body.condition) {
        throw new ForkConditionMissing('You must provide a condition to fork a stream');
      }

      const { scopedClusterClient } = await getScopedClients({ request });

      const { definition: rootDefinition } = await readStream({
        scopedClusterClient,
        id: params.path.id,
      });

      const childDefinition = { ...params.body.stream, children: [] };

      // check whether root stream has a child of the given name already
      if (rootDefinition.children.some((child) => child.id === childDefinition.id)) {
        throw new MalformedStreamId(
          `The stream with ID (${params.body.stream.id}) already exists as a child of the parent stream`
        );
      }

      if (!isChildOf(rootDefinition, childDefinition)) {
        throw new MalformedStreamId(
          `The ID (${params.body.stream.id}) from the new stream must start with the parent's id (${rootDefinition.id}), followed by a dot and a name`
        );
      }

      await validateAncestorFields(
        scopedClusterClient,
        params.body.stream.id,
        params.body.stream.fields
      );

      // need to create the child first, otherwise we risk streaming data even though the child data stream is not ready
      await syncStream({
        scopedClusterClient,
        definition: childDefinition,
        rootDefinition,
        logger,
      });

      rootDefinition.children.push({
        id: params.body.stream.id,
        condition: params.body.condition,
      });

      await syncStream({
        scopedClusterClient,
        definition: rootDefinition,
        rootDefinition,
        logger,
      });

      await syncStream({
        scopedClusterClient,
        definition: childDefinition,
        rootDefinition,
        logger,
      });

      return { acknowledged: true };
    } catch (e) {
      if (e instanceof IndexTemplateNotFound || e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      if (
        e instanceof SecurityException ||
        e instanceof ForkConditionMissing ||
        e instanceof MalformedStreamId
      ) {
        throw badRequest(e);
      }

      throw internal(e);
    }
  },
});
