/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'src/core/server';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

async function fetchSnapshotPolicies(callAsCurrentUser: APICaller): Promise<any> {
  const params = {
    method: 'GET',
    path: '/_slm/policy',
  };

  return await callAsCurrentUser('transport.request', params);
}

export function registerFetchRoute({ router, license, lib }: RouteDependencies) {
  router.get(
    { path: addBasePath('/snapshot_policies'), validate: false },
    license.guardApiRoute(async (context, request, response) => {
      try {
        const policiesByName = await fetchSnapshotPolicies(
          context.core.elasticsearch.legacy.client.callAsCurrentUser
        );
        const policies = Object.keys(policiesByName);
        const okResponse = { body: policies };
        return response.ok(okResponse);
      } catch (e) {
        if (lib.isEsError(e)) {
          return response.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return response.internalError({ body: e });
      }
    })
  );
}
