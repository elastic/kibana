/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';

export function registerDeleteRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/remote_clusters/{name}',
    method: 'DELETE',
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { name } = request.params;

      const deleteClusterPayload = {
        persistent: {
          cluster: {
            remote: {
              [name]: {
                seeds: null,

                // If this setting was set on the cluster, we're not able to delete it unless
                // we also set the setting to null. Leave this here until ES issue is confirmed/fixed.
                skip_unavailable: null,
              }
            }
          }
        }
      };

      try {
        return await callWithRequest('cluster.putSettings', { body: deleteClusterPayload });
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
