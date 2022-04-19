/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { get } from 'lodash';
import { IScopedClusterClient } from '@kbn/core/server';
// @ts-ignore
import { WatchStatus } from '../../../../models/watch_status';
import { RouteDependencies } from '../../../../types';

const paramsSchema = schema.object({
  watchId: schema.string(),
  actionId: schema.string(),
});

function acknowledgeAction(dataClient: IScopedClusterClient, watchId: string, actionId: string) {
  return dataClient.asCurrentUser.watcher.ackWatch({
    watch_id: watchId,
    action_id: actionId,
  });
}

export function registerAcknowledgeRoute({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) {
  router.put(
    {
      path: '/api/watcher/watch/{watchId}/action/{actionId}/acknowledge',
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (ctx, request, response) => {
      const { watchId, actionId } = request.params;

      try {
        const hit = await acknowledgeAction(ctx.core.elasticsearch.client, watchId, actionId);
        const watchStatusJson = get(hit, 'status');
        const json = {
          id: watchId,
          watchStatusJson,
        };

        const watchStatus = WatchStatus.fromUpstreamJson(json);
        return response.ok({
          body: { watchStatus: watchStatus.downstreamJson },
        });
      } catch (e) {
        if (e?.statusCode === 404 && e.meta?.body?.error) {
          e.meta.body.error.reason = `Watch with id = ${watchId} not found`;
        }
        return handleEsError({ error: e, response });
      }
    })
  );
}
