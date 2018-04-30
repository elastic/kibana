/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';

function getIndexArrayFromPayload(payload) {
  return payload.indices || [];
}

async function clearCache(callWithRequest, indices) {
  const params = {
    ignoreUnavailable: true,
    allowNoIndices: false,
    expandWildcards: 'none',
    format: 'json',
    index: indices
  };

  return await callWithRequest('indices.clearCache', params);
}

export function registerClearCacheRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_management/indices/clear_cache',
    method: 'POST',
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const indices = getIndexArrayFromPayload(request.payload);

      try {
        await clearCache(callWithRequest, indices);

        //TODO: Should we check acknowledged = true?
        reply();
      } catch (err) {
        if (isEsError(err)) {
          return reply(wrapEsError(err));
        }

        reply(wrapUnknownError(err));
      }
    },
    config: {
      pre: [ licensePreRouting ]
    }
  });
}
