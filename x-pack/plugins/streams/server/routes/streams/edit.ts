/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { badRequest, internal, notFound } from '@hapi/boom';
import {
  DefinitionNotFound,
  ForkConditionMissing,
  IndexTemplateNotFound,
  SecurityException,
} from '../../lib/streams/errors';
import { createServerRoute } from '../create_server_route';
import { StreamDefinition, streamWithoutIdDefinitonSchema } from '../../../common/types';
import {
  syncStream,
  readStream,
  checkStreamExists,
  validateAncestorFields,
  validateDescendantFields,
} from '../../lib/streams/stream_crud';
import { MalformedStreamId } from '../../lib/streams/errors/malformed_stream_id';
import { getParentId } from '../../lib/streams/helpers/hierarchy';
import { MalformedChildren } from '../../lib/streams/errors/malformed_children';

export const editStreamRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{id}',
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
    body: streamWithoutIdDefinitonSchema,
  }),
  handler: async ({ response, params, logger, request, getScopedClients }) => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });

      await validateStreamChildren(scopedClusterClient, params.path.id, params.body.children);
      await validateAncestorFields(scopedClusterClient, params.path.id, params.body.fields);
      await validateDescendantFields(scopedClusterClient, params.path.id, params.body.fields);

      const parentId = getParentId(params.path.id);
      let parentDefinition: StreamDefinition | undefined;

      if (parentId) {
        parentDefinition = await updateParentStream(
          scopedClusterClient,
          parentId,
          params.path.id,
          logger
        );
      }
      const streamDefinition = { ...params.body };

      await syncStream({
        scopedClusterClient,
        definition: { ...streamDefinition, id: params.path.id },
        rootDefinition: parentDefinition,
        logger,
      });

      for (const child of streamDefinition.children) {
        const streamExists = await checkStreamExists({
          scopedClusterClient,
          id: child.id,
        });
        if (streamExists) {
          continue;
        }
        // create empty streams for each child if they don't exist
        const childDefinition = {
          id: child.id,
          children: [],
          fields: [],
          processing: [],
        };

        await syncStream({
          scopedClusterClient,
          definition: childDefinition,
          logger,
        });
      }

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

async function updateParentStream(
  scopedClusterClient: IScopedClusterClient,
  parentId: string,
  id: string,
  logger: Logger
) {
  const { definition: parentDefinition } = await readStream({
    scopedClusterClient,
    id: parentId,
  });

  if (!parentDefinition.children.some((child) => child.id === id)) {
    // add the child to the parent stream with an empty condition for now
    parentDefinition.children.push({
      id,
      condition: undefined,
    });

    await syncStream({
      scopedClusterClient,
      definition: parentDefinition,
      logger,
    });
  }
  return parentDefinition;
}

async function validateStreamChildren(
  scopedClusterClient: IScopedClusterClient,
  id: string,
  children: Array<{ id: string }>
) {
  try {
    const { definition: oldDefinition } = await readStream({
      scopedClusterClient,
      id,
    });
    const oldChildren = oldDefinition.children.map((child) => child.id);
    const newChildren = new Set(children.map((child) => child.id));
    if (oldChildren.some((child) => !newChildren.has(child))) {
      throw new MalformedChildren(
        'Cannot remove children from a stream, please delete the stream instead'
      );
    }
  } catch (e) {
    // Ignore if the stream does not exist, but re-throw if it's another error
    if (!(e instanceof DefinitionNotFound)) {
      throw e;
    }
  }
}
