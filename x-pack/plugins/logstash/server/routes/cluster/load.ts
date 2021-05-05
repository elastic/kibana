/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wrapRouteWithLicenseCheck } from '../../../../licensing/server';
import { Cluster } from '../../models/cluster';
import { checkLicense } from '../../lib/check_license';
import type { LogstashPluginRouter } from '../../types';

export function registerClusterLoadRoute(router: LogstashPluginRouter) {
  router.get(
    {
      path: '/api/logstash/cluster',
      validate: false,
    },
    wrapRouteWithLicenseCheck(checkLicense, async (context, request, response) => {
      try {
        const { client } = context.core.elasticsearch;
        const { body: info } = await client.asCurrentUser.info();
        return response.ok({
          body: {
            cluster: Cluster.fromUpstreamJSON(info).downstreamJSON,
          },
        });
      } catch (err) {
        if (err.status === 403) {
          return response.ok();
        }
        throw err;
      }
    })
  );
}
