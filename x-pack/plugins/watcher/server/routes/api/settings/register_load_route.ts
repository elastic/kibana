/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
// @ts-ignore
import { Settings } from '../../../models/settings';
import { RouteDependencies } from '../../../types';

function fetchClusterSettings(client: IScopedClusterClient) {
  return client.asCurrentUser.cluster.getSettings({
    include_defaults: true,
    filter_path: '**.xpack.notification',
  });
}

export function registerLoadRoute({ router, license, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    {
      path: '/api/watcher/settings',
      validate: false,
    },
    license.guardApiRoute(async (ctx, request, response) => {
      try {
        const settings = await fetchClusterSettings(ctx.core.elasticsearch.client);
        return response.ok({ body: Settings.fromUpstreamJson(settings).downstreamJson });
      } catch (e) {
        return handleEsError({ error: e, response });
      }
    })
  );
}
