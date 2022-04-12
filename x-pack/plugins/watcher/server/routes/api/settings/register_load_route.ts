/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
// @ts-ignore
import { Settings } from '../../../models/settings/index';
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
        const esClient = (await ctx.core).elasticsearch.client;
        const settings = await fetchClusterSettings(esClient);
        return response.ok({ body: Settings.fromUpstreamJson(settings).downstreamJson });
      } catch (e) {
        return handleEsError({ error: e, response });
      }
    })
  );
}
