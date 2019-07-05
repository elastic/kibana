/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { wrapCustomError, wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';

import { get } from 'lodash';
import { doesClusterExist } from '../../../lib/does_cluster_exist';
import { serializeCluster } from '../../../lib/cluster_serialization';

export function registerDeleteRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/remote_clusters/{name}',
    method: 'DELETE',
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { name } = request.params;

      // Check if cluster does exist
      try {
        const existingCluster = await doesClusterExist(callWithRequest, name);
        if(!existingCluster) {
          return wrapCustomError(new Error('There is no remote cluster with that name.'), 404);
        }
      } catch (err) {
        return wrapCustomError(err, 400);
      }

      try {
        const deleteClusterPayload = serializeCluster({ name });
        const response = await callWithRequest('cluster.putSettings', { body: deleteClusterPayload });
        const acknowledged = get(response, 'acknowledged');
        const cluster = get(response, `persistent.cluster.remote.${name}`);

        if (acknowledged && !cluster) {
          return {};
        }

        // If for some reason the ES response still returns the cluster information,
        // return an error. This shouldn't happen.
        return wrapCustomError(new Error('Unable to delete cluster, information still returned from ES.'), 400);
      } catch (err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
    config: {
      pre: [ licensePreRouting ]
    }
  });
}
