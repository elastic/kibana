/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { RouteDependencies } from '../../../types';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

const bodySchema = schema.object({
  watchIds: schema.arrayOf(schema.string()),
});

function deleteWatches(dataClient: ILegacyScopedClusterClient, watchIds: string[]) {
  const deletePromises = watchIds.map((watchId) => {
    return dataClient
      .callAsCurrentUser('watcher.deleteWatch', {
        id: watchId,
      })
      .then((success: Array<{ _id: string }>) => ({ success }))
      .catch((error: Array<{ _id: string }>) => ({ error }));
  });

  return Promise.all(deletePromises).then((results) => {
    const errors: Error[] = [];
    const successes: boolean[] = [];
    results.forEach(({ success, error }: { success?: any; error?: any }) => {
      if (success) {
        successes.push(success._id);
      } else if (error) {
        errors.push(error._id);
      }
    });

    return {
      successes,
      errors,
    };
  });
}

export function registerDeleteRoute(deps: RouteDependencies) {
  deps.router.post(
    {
      path: '/api/watcher/watches/delete',
      validate: {
        body: bodySchema,
      },
    },
    licensePreRoutingFactory(deps, async (ctx, request, response) => {
      try {
        const results = await deleteWatches(ctx.watcher!.client, request.body.watchIds);
        return response.ok({ body: { results } });
      } catch (e) {
        return response.internalError({ body: e });
      }
    })
  );
}
