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

function asTrees(definitions: StreamDefinition[]): StreamTree[] {
  const nodes = new Map<string, StreamTree>();

  const rootNodes = new Set<StreamTree>();

  function getNode(id: string) {
    let node = nodes.get(id);
    if (!node) {
      node = { id, children: [] };
      nodes.set(id, node);
    }
    return node;
  }

  definitions.forEach((definition) => {
    const path = definition.id.split('.');
    const parentId = path.slice(0, path.length - 1).join('.');
    const parentNode = parentId.length ? getNode(parentId) : undefined;
    const selfNode = getNode(definition.id);

    if (parentNode) {
      parentNode.children.push(selfNode);
    } else {
      rootNodes.add(selfNode);
    }
  });

  return Array.from(rootNodes.values());
}
