/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';

import { get } from 'lodash';
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

        const allClustersByName = await callWithRequest('cluster.remoteInfo');
        const allClusterNames = (allClustersByName && Object.keys(allClustersByName)) || [];

        return allClusterNames.map(name => {
          const isTransient = transientClusterNames.includes(name);
          const isPersistent = persistentClusterNames.includes(name);
          return deserializeCluster(name, {
            ...allClustersByName[name],
            isTransient,
            isPersistent,
            settings: {
              transient: isTransient ? { ...get(clusterSettings, `transient.cluster.remote.${name}`) } : undefined,
              persistent: isPersistent ? { ...get(clusterSettings, `persistent.cluster.remote.${name}`) } : undefined,
            }
          });
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
