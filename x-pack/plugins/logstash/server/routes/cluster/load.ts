/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ICustomClusterClient, IRouter } from 'src/core/server';
import { licenseCheckerRouteHandlerWrapper } from '../../../../licensing/server';
import { Cluster } from '../../models/cluster';
import { checkLicense } from '../../lib/check_license';

export function registerClusterLoadRoute(router: IRouter, esClient: ICustomClusterClient) {
  router.get(
    {
      path: '/api/logstash/cluster',
      validate: false,
    },
    licenseCheckerRouteHandlerWrapper(
      checkLicense,
      router.handleLegacyErrors(async (context, request, response) => {
        try {
          const client = esClient.asScoped(request);
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
    )
  );
}
