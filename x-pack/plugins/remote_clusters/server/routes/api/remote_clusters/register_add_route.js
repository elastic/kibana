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

export function registerAddRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/remote_clusters',
    method: 'POST',
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { name, ...rest } = request.payload;

      const addClusterPayload = {
        persistent: {
          cluster: {
            remote: {
              [name]: {
                ...rest,
              }
            }
          }
        }
      };

      try {
        return await callWithRequest('cluster.putSettings', { body: addClusterPayload });
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
          name: Joi.string().required(),
          seeds: Joi.array().items(Joi.string()).required(),
          skip_unavailable: Joi.boolean().optional(),
        }).required()
      }
    }
  });
}
