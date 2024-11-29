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
import {
  syncStream,
  readStream,
  deleteStreamObjects,
  deleteUnmanagedStreamObjects,
} from '../../lib/streams/stream_crud';
import { MalformedStreamId } from '../../lib/streams/errors/malformed_stream_id';
import { getParentId } from '../../lib/streams/helpers/hierarchy';

export const deleteStreamRoute = createServerRoute({
  endpoint: 'DELETE /api/streams/{id}',
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
  }),
  handler: async ({
    response,
    params,
    logger,
    request,
    getScopedClients,
  }): Promise<{ acknowledged: true }> => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });

      const parentId = getParentId(params.path.id);
      if (!parentId) {
        throw new MalformedStreamId('Cannot delete root stream');
      }

      // need to update parent first to cut off documents streaming down
      await updateParentStream(scopedClusterClient, params.path.id, parentId, logger);

      await deleteStream(scopedClusterClient, params.path.id, logger);

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

export async function deleteStream(
  scopedClusterClient: IScopedClusterClient,
  id: string,
  logger: Logger
) {
  try {
    const { definition } = await readStream({ scopedClusterClient, id });
    if (!definition.managed) {
      await deleteUnmanagedStreamObjects({ scopedClusterClient, id, logger });
      return;
    }
    for (const child of definition.children) {
      await deleteStream(scopedClusterClient, child.id, logger);
    }
    await deleteStreamObjects({ scopedClusterClient, id, logger });
  } catch (e) {
    if (e instanceof DefinitionNotFound) {
      logger.debug(`Stream definition for ${id} not found.`);
    } else {
      throw e;
    }
  }
}

async function updateParentStream(
  scopedClusterClient: IScopedClusterClient,
  id: string,
  parentId: string,
  logger: Logger
) {
  const { definition: parentDefinition } = await readStream({
    scopedClusterClient,
    id: parentId,
  });

  parentDefinition.children = parentDefinition.children.filter((child) => child.id !== id);

  await syncStream({
    scopedClusterClient,
    definition: parentDefinition,
    logger,
  });
  return parentDefinition;
}
