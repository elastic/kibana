/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { LegacyAPICaller } from 'src/core/server';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

async function retryLifecycle(callAsCurrentUser: LegacyAPICaller, indexNames: string[]) {
  const responses = [];
  for (let i = 0; i < indexNames.length; i++) {
    const indexName = indexNames[i];
    const params = {
      method: 'POST',
      path: `/${encodeURIComponent(indexName)}/_ilm/retry`,
      ignore: [404],
    };

    responses.push(callAsCurrentUser('transport.request', params));
  }
  return Promise.all(responses);
}

const bodySchema = schema.object({
  indexNames: schema.arrayOf(schema.string()),
});

export function registerRetryRoute({ router, license, lib }: RouteDependencies) {
  router.post(
    { path: addBasePath('/index/retry'), validate: { body: bodySchema } },
    license.guardApiRoute(async (context, request, response) => {
      const body = request.body as typeof bodySchema.type;
      const { indexNames } = body;

      try {
        await retryLifecycle(
          context.core.elasticsearch.legacy.client.callAsCurrentUser,
          indexNames
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
