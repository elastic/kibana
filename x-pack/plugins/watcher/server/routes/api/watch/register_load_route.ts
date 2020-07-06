/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { get } from 'lodash';
import { isEsError } from '../../../shared_imports';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
// @ts-ignore
import { Watch } from '../../../models/watch/index';
import { RouteDependencies } from '../../../types';

const paramsSchema = schema.object({
  id: schema.string(),
});

function fetchWatch(dataClient: ILegacyScopedClusterClient, watchId: string) {
  return dataClient.callAsCurrentUser('watcher.getWatch', {
    id: watchId,
  });
}

export function registerLoadRoute(deps: RouteDependencies) {
  deps.router.get(
    {
      path: '/api/watcher/watch/{id}',
      validate: {
        params: paramsSchema,
      },
    },
    licensePreRoutingFactory(deps, async (ctx, request, response) => {
      const id = request.params.id;

      try {
        const hit = await fetchWatch(ctx.watcher!.client, id);
        const watchJson = get(hit, 'watch');
        const watchStatusJson = get(hit, 'status');
        const json = {
          id,
          watchJson,
          watchStatusJson,
        };

        const watch = Watch.fromUpstreamJson(json, {
          throwExceptions: {
            Action: false,
          },
        });
        return response.ok({
          body: { watch: watch.downstreamJson },
        });
      } catch (e) {
        // Case: Error from Elasticsearch JS client
        if (isEsError(e)) {
          const body = e.statusCode === 404 ? `Watch with id = ${id} not found` : e;
          return response.customError({ statusCode: e.statusCode, body });
        }

        // Case: default
        return response.internalError({ body: e });
      }
    })
  );
}
