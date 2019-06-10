/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { wrapEsError, wrapCustomError, wrapUnknownError } from '../../../lib/error_wrappers';

import { get } from 'lodash';
import { doesClusterExist } from '../../../lib/does_cluster_exist';
import { serializeCluster, deserializeCluster } from '../../../lib/cluster_serialization';

export function registerAddRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/remote_clusters',
    method: 'POST',
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { name, seeds, skipUnavailable } = request.payload;

      // Check if cluster already exists
      try {
        const existingCluster = await doesClusterExist(callWithRequest, name);
        if(existingCluster) {
          return wrapCustomError(new Error('There is already a remote cluster with that name.'), 409);
        }
      } catch (err) {
        return wrapCustomError(err, 400);
      }

      try {
        const addClusterPayload = serializeCluster({ name, seeds, skipUnavailable });
        const response = await callWithRequest('cluster.putSettings', { body: addClusterPayload });
        const acknowledged = get(response, 'acknowledged');
        const cluster = get(response, `persistent.cluster.remote.${name}`);

        if (acknowledged && cluster) {
          return {
            ...deserializeCluster(name, cluster),
            isConfiguredByNode: false,
          };
        }

        // If for some reason the ES response did not acknowledge,
        // return an error. This shouldn't happen.
        return wrapCustomError(new Error('Unable to add cluster, no response returned from ES.'), 400);
      } catch (err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
    config: {
      pre: [ licensePreRouting ],
      validate: {
        payload: Joi.object({
          name: Joi.string().required(),
          seeds: Joi.array().items(Joi.string()).required(),
          skipUnavailable: Joi.boolean().allow(null).optional(),
        }).required()
      }
    }
  });
}
