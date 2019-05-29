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
    path: '/api/remote_clusters/{nameOrNames}',
    method: 'DELETE',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { nameOrNames } = request.params;
      const names = nameOrNames.split(',');

      const itemsDeleted = [];
      const errors = [];

      // Validator that returns an error if the remote cluster does not exist.
      const validateClusterDoesExist = async (name) => {
        try {
          const existingCluster = await doesClusterExist(callWithRequest, name);
          if (!existingCluster) {
            return wrapCustomError(new Error('There is no remote cluster with that name.'), 404);
          }
        } catch (error) {
          return wrapCustomError(error, 400);
        }
      };

      // Send the request to delete the cluster and return an error if it could not be deleted.
      const sendRequestToDeleteCluster = async (name) => {
        try {
          const body = serializeCluster({ name });
          const response = await callWithRequest('cluster.putSettings', { body });
          const acknowledged = get(response, 'acknowledged');
          const cluster = get(response, `persistent.cluster.remote.${name}`);

          if (acknowledged && !cluster) {
            return null;
          }

          // If for some reason the ES response still returns the cluster information,
          // return an error. This shouldn't happen.
          return wrapCustomError(new Error('Unable to delete cluster, information still returned from ES.'), 400);
        } catch (error) {
          if (isEsError(error)) {
            return wrapEsError(error);
          }

          return wrapUnknownError(error);
        }
      };

      const deleteCluster = async (clusterName) => {
        try {
          // Validate that the cluster exists
          let error = await validateClusterDoesExist(clusterName);

          if (!error) {
            // Delete the cluster
            error = await sendRequestToDeleteCluster(clusterName);
          }

          if (error) {
            throw error;
          }

          // If we are here, it means that everything went well...
          itemsDeleted.push(clusterName);
        } catch (error) {
          errors.push({ name: clusterName, error });
        }
      };

      // Delete all our cluster in parallel
      await Promise.all(names.map(deleteCluster));

      return {
        itemsDeleted,
        errors,
      };
    }
  });
}
