/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IScopedClusterClient } from 'kibana/server';
import { RouteDependencies } from '../../../types';

// @ts-ignore
import { Watch } from '../../../models/watch/index';
// @ts-ignore
import { VisualizeOptions } from '../../../models/visualize_options/index';

const bodySchema = schema.object({
  watch: schema.object({}, { unknowns: 'allow' }),
  options: schema.object({}, { unknowns: 'allow' }),
});

function fetchVisualizeData(dataClient: IScopedClusterClient, index: any, body: any) {
  return dataClient.asCurrentUser
    .search(
      {
        index,
        body,
        allow_no_indices: true,
        ignore_unavailable: true,
      },
      { ignore: [404] }
    )
    .then((result) => result);
}

export function registerVisualizeRoute({
  router,
  license,
  lib: { handleEsError },
  kibanaVersion,
}: RouteDependencies) {
  router.post(
    {
      path: '/api/watcher/watch/visualize',
      validate: {
        body: bodySchema,
      },
    },
    license.guardApiRoute(async (ctx, request, response) => {
      const watch = Watch.fromDownstreamJson(request.body.watch);
      const options = VisualizeOptions.fromDownstreamJson(request.body.options);
      const body = watch.getVisualizeQuery(options, kibanaVersion);

      try {
        const hits = await fetchVisualizeData(ctx.core.elasticsearch.client, watch.index, body);
        const visualizeData = watch.formatVisualizeData(hits);

        return response.ok({
          body: {
            visualizeData,
          },
        });
      } catch (e) {
        return handleEsError({ error: e, response });
      }
    })
  );
}
