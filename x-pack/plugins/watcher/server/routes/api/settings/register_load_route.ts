/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient } from 'kibana/server';
import { isEsError } from '../../../shared_imports';
// @ts-ignore
import { Settings } from '../../../models/settings/index';
import { RouteDependencies } from '../../../types';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

function fetchClusterSettings(client: ILegacyScopedClusterClient) {
  return client.callAsInternalUser('cluster.getSettings', {
    includeDefaults: true,
    filterPath: '**.xpack.notification',
  });
}

export function registerLoadRoute(deps: RouteDependencies) {
  deps.router.get(
    {
      path: '/api/watcher/settings',
      validate: false,
    },
    licensePreRoutingFactory(deps, async (ctx, request, response) => {
      try {
        const settings = await fetchClusterSettings(ctx.watcher!.client);
        return response.ok({ body: Settings.fromUpstreamJson(settings).downstreamJson });
      } catch (e) {
        // Case: Error from Elasticsearch JS client
        if (isEsError(e)) {
          return response.customError({ statusCode: e.statusCode, body: e });
        }

        // Case: default
        return response.internalError({ body: e });
      }
    })
  );
}
