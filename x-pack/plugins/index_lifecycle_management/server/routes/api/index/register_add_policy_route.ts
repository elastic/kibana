/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { LegacyAPICaller } from 'src/core/server';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

async function addLifecyclePolicy(
  callAsCurrentUser: LegacyAPICaller,
  indexName: string,
  policyName: string,
  alias: string
) {
  const params = {
    method: 'PUT',
    path: `/${encodeURIComponent(indexName)}/_settings`,
    body: {
      lifecycle: {
        name: policyName,
        rollover_alias: alias,
      },
    },
  };

  return callAsCurrentUser('transport.request', params);
}

const bodySchema = schema.object({
  indexName: schema.string(),
  policyName: schema.string(),
  alias: schema.maybe(schema.string()),
});

export function registerAddPolicyRoute({ router, license, lib }: RouteDependencies) {
  router.post(
    { path: addBasePath('/index/add'), validate: { body: bodySchema } },
    license.guardApiRoute(async (context, request, response) => {
      const body = request.body as typeof bodySchema.type;
      const { indexName, policyName, alias = '' } = body;

      try {
        await addLifecyclePolicy(
          context.core.elasticsearch.legacy.client.callAsCurrentUser,
          indexName,
          policyName,
          alias
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
