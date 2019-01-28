/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { deserializeCluster } from '../../../lib/cluster_serialization';

export function registerListRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/remote_clusters',
    method: 'GET',
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const clusterSettings = await callWithRequest('cluster.getSettings');
        const transientClusterNames = Object.keys(get(clusterSettings, `transient.cluster.remote`) || {});
        const persistentClusterNames = Object.keys(get(clusterSettings, `persistent.cluster.remote`) || {});

        const clustersByName = await callWithRequest('cluster.remoteInfo');
        const clusterNames = (clustersByName && Object.keys(clustersByName)) || [];

        return clusterNames.map(clusterName => {
          const cluster = clustersByName[clusterName];
          const isTransient = transientClusterNames.includes(clusterName);
          const isPersistent = persistentClusterNames.includes(clusterName);
          // If the cluster hasn't been stored in the cluster state, then it's defined by the
          // node's config file.
          const isConfiguredByNode = !isTransient && !isPersistent;

          return {
            ...deserializeCluster(clusterName, cluster),
            isConfiguredByNode,
          };
        });

      } catch (err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }

        throw wrapUnknownError(err);
      }
    },
    config: {
      pre: [ licensePreRouting ]
    }
  });
}
