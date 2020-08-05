/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'src/core/server';
import { wrapRouteWithLicenseCheck } from '../../../../licensing/server';
import { Cluster } from '../../models/cluster';
import { checkLicense } from '../../lib/check_license';

export function registerClusterLoadRoute(router: IRouter) {
  router.get(
    {
      path: '/api/logstash/cluster',
      validate: false,
    },
    wrapRouteWithLicenseCheck(checkLicense, async (context, request, response) => {
      try {
        const client = context.logstash!.esClient;
        const info = await client.callAsCurrentUser('info');
        return response.ok({
          body: {
            cluster: Cluster.fromUpstreamJSON(info).downstreamJSON,
          },
        });
      } catch (err) {
        if (err.status === 403) {
          return response.ok();
        }
        return response.internalError();
      }
    })
  );
}
