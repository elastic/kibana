/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { schema } from '@kbn/config-schema';
import { IScopedClusterClient } from 'kibana/server';
import { RouteDependencies } from '../../../types';

const bodySchema = schema.object({
  watchIds: schema.arrayOf(schema.string()),
});

type DeleteWatchPromiseArray = Promise<{
  success?: estypes.WatcherDeleteWatchResponse;
  error?: any;
}>;

function deleteWatches(dataClient: IScopedClusterClient, watchIds: string[]) {
  const deletePromises = watchIds.map<DeleteWatchPromiseArray>((watchId) => {
    return dataClient.asCurrentUser.watcher
      .deleteWatch({
        id: watchId,
      })
      .then((success) => ({ success }))
      .catch((error) => ({ error }));
  });

  return Promise.all(deletePromises).then((results) => {
    const errors: Error[] = [];
    const successes: string[] = [];
    results.forEach(({ success, error }) => {
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

export function registerDeleteRoute({ router, license }: RouteDependencies) {
  router.post(
    {
      path: '/api/watcher/watches/delete',
      validate: {
        body: bodySchema,
      },
    },
    license.guardApiRoute(async (ctx, request, response) => {
      const esClient = (await ctx.core).elasticsearch.client;
      const results = await deleteWatches(esClient, request.body.watchIds);
      return response.ok({ body: { results } });
    })
  );
}
