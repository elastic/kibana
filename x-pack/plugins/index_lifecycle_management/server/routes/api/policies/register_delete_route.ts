/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { LegacyAPICaller } from 'src/core/server';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

async function deletePolicies(
  callAsCurrentUser: LegacyAPICaller,
  policyNames: string
): Promise<any> {
  const params = {
    method: 'DELETE',
    path: `/_ilm/policy/${encodeURIComponent(policyNames)}`,
    // we allow 404 since they may have no policies
    ignore: [404],
  };

  return await callAsCurrentUser('transport.request', params);
}

const paramsSchema = schema.object({
  policyNames: schema.string(),
});

export function registerDeleteRoute({ router, license, lib }: RouteDependencies) {
  router.delete(
    { path: addBasePath('/policies/{policyNames}'), validate: { params: paramsSchema } },
    license.guardApiRoute(async (context, request, response) => {
      const params = request.params as typeof paramsSchema.type;
      const { policyNames } = params;

      try {
        await deletePolicies(
          context.core.elasticsearch.legacy.client.callAsCurrentUser,
          policyNames
        );
        return response.ok();
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
