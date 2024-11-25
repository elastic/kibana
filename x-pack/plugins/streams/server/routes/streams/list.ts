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
import { listStreams } from '../../lib/streams/stream_crud';
import { StreamDefinition } from '../../../common';

export const listStreamsRoute = createServerRoute({
  endpoint: 'GET /api/streams',
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
  params: z.object({}),
  handler: async ({
    response,
    request,
    getScopedClients,
  }): Promise<{ definitions: StreamDefinition[]; trees: StreamTree[] }> => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });
      const { definitions } = await listStreams({ scopedClusterClient });

      const trees = asTrees(definitions);

      return { definitions, trees };
    } catch (e) {
      if (e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      throw internal(e);
    }
  },
});

export interface StreamTree {
  id: string;
  children: StreamTree[];
}

function asTrees(definitions: Array<{ id: string }>) {
  const trees: StreamTree[] = [];
  const ids = definitions.map((definition) => definition.id);

  ids.sort((a, b) => a.split('.').length - b.split('.').length);

  ids.forEach((id) => {
    let currentTree = trees;
    let existingNode: StreamTree | undefined;
    // traverse the tree following the prefix of the current id.
    // once we reach the leaf, the current id is added as child - this works because the ids are sorted by depth
    while ((existingNode = currentTree.find((node) => id.startsWith(node.id)))) {
      currentTree = existingNode.children;
    }
    if (!existingNode) {
      const newNode = { id, children: [] };
      currentTree.push(newNode);
    }
  });

  return trees;
}
