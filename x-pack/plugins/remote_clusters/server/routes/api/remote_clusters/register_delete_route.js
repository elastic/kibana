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
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { name } = request.params;
      const names = name.split(',');

      const itemsDeleted = [];
      const errors = [];

      await Promise.all(names.map((clusterName) => (
        new Promise(async (resolve, reject) => {
          // Check if cluster does exist
          try {
            const existingCluster = await doesClusterExist(callWithRequest, clusterName);
            if (!existingCluster) {
              return reject(wrapCustomError(new Error('There is no remote cluster with that name.'), 404));
            }
          } catch (err) {
            return reject(wrapCustomError(err, 400));
          }

          try {
            const deleteClusterPayload = serializeCluster({ name: clusterName });
            const response = await callWithRequest('cluster.putSettings', { body: deleteClusterPayload });
            const acknowledged = get(response, 'acknowledged');
            const cluster = get(response, `persistent.cluster.remote.${clusterName}`);

            if (acknowledged && !cluster) {
              return resolve();
            }

            // If for some reason the ES response still returns the cluster information,
            // return an error. This shouldn't happen.
            reject(wrapCustomError(new Error('Unable to delete cluster, information still returned from ES.'), 400));
          } catch (err) {
            if (isEsError(err)) {
              return reject(wrapEsError(err));
            }

            reject(wrapUnknownError(err));
          }
        })
          .then(() => itemsDeleted.push(clusterName))
          .catch(err => errors.push({ name: clusterName, error: err }))
      )));

      return {
        itemsDeleted,
        errors,
      };
    }
  });
}
