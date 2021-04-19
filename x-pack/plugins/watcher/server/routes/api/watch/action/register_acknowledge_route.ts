/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { get } from 'lodash';
import { ILegacyScopedClusterClient } from 'kibana/server';
// @ts-ignore
import { WatchStatus } from '../../../../models/watch_status/index';
import { RouteDependencies } from '../../../../types';

const paramsSchema = schema.object({
  watchId: schema.string(),
  actionId: schema.string(),
});

function acknowledgeAction(
  dataClient: ILegacyScopedClusterClient,
  watchId: string,
  actionId: string
) {
  return dataClient.callAsCurrentUser('watcher.ackWatch', {
    id: watchId,
    action: actionId,
  });
}

export function registerAcknowledgeRoute({
  router,
  license,
  lib: { isEsError },
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
        const hit = await acknowledgeAction(ctx.watcher!.client, watchId, actionId);
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
        // Case: Error from Elasticsearch JS client
        if (isEsError(e)) {
          const body = e.statusCode === 404 ? `Watch with id = ${watchId} not found` : e;
          return response.customError({ statusCode: e.statusCode, body });
        }

        // Case: default
        throw e;
      }
    })
  );
}
