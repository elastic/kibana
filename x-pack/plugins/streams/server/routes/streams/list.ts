/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createServerRoute } from '../create_server_route';
import { DefinitionNotFound } from '../../lib/streams/errors';
import { listStreams } from '../../lib/streams/stream_crud';

export const listStreamsRoute = createServerRoute({
  endpoint: 'GET /api/streams 2023-10-31',
  options: {
    access: 'public',
    availability: {
      stability: 'experimental',
    },
    security: {
      authz: {
        enabled: false,
        reason:
          'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
      },
    },
  },
  params: z.object({}),
  handler: async ({ response, request, getScopedClients }) => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });
      const definitions = await listStreams({ scopedClusterClient });

      const trees = asTrees(definitions);

      return response.ok({ body: { streams: trees } });
    } catch (e) {
      if (e instanceof DefinitionNotFound) {
        return response.notFound({ body: e });
      }

      return response.customError({ body: e, statusCode: 500 });
    }
  },
});

interface ListStreamDefinition {
  id: string;
  children: ListStreamDefinition[];
}

function asTrees(definitions: Array<{ id: string[] }>) {
  const trees: ListStreamDefinition[] = [];
  const ids = definitions.map((definition) => definition.id[0]);

  ids.sort((a, b) => a.split('.').length - b.split('.').length);

  ids.forEach((id) => {
    let currentTree = trees;
    let existingNode: ListStreamDefinition | undefined;
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
