/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';

export function registerUpdateRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/remote_clusters/{name}',
    method: 'PUT',
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { name } = request.params;

      const updateClusterPayload = {
        persistent: {
          cluster: {
            remote: {
              [name]: {
                ...request.payload,
              }
            }
          }
        }
      };

      try {
        return await callWithRequest('cluster.putSettings', { body: updateClusterPayload });
      } catch (err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }

        throw wrapUnknownError(err);
      }
    },
    config: {
      pre: [ licensePreRouting ],
      validate: {
        payload: Joi.object({
          seeds: Joi.array().items(Joi.string()),
          skip_unavailable: Joi.boolean().optional()
        }).required()
      }
    }
  });
}
