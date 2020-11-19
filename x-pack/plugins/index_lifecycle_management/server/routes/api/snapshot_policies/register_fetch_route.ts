/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'kibana/server';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

async function fetchSnapshotPolicies(client: ElasticsearchClient): Promise<any> {
  const response = await client.slm.getLifecycle();
  return response.body;
}

export function registerFetchRoute({ router, license, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    { path: addBasePath('/snapshot_policies'), validate: false },
    license.guardApiRoute(async (context, request, response) => {
      try {
        const policiesByName = await fetchSnapshotPolicies(
          context.core.elasticsearch.client.asCurrentUser
        );
        return response.ok({ body: Object.keys(policiesByName) });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
