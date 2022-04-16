/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

export function registerNodesRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  // Retrieve the es plugins installed on the cluster nodes
  router.get(
    { path: addBasePath('/nodes/plugins'), validate: {} },
    async (context, request, response) => {
      const { client } = context.core.elasticsearch;

      try {
        const body = await client.asCurrentUser.nodes.info();
        const plugins: Set<string> = Object.values(body.nodes).reduce((acc, nodeInfo) => {
          nodeInfo.plugins?.forEach(({ name }) => {
            acc.add(name);
          });
          return acc;
        }, new Set<string>());

        return response.ok({ body: Array.from(plugins) });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
