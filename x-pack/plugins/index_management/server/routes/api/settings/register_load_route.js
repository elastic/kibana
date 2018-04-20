/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';

// response comes back as { [indexName]: { ... }}
// so plucking out the embedded object
function formatHit(hit) {
  const key = Object.keys(hit)[0];
  return hit[key];
}

async function fetchSettings(callWithRequest, indexName) {
  const params = {
    ignoreUnavailable: true,
    allowNoIndices: false,
    expandWildcards: 'none',
    flatSettings: false,
    local: false,
    includeDefaults: true,
    index: indexName,
  };

  return await callWithRequest('indices.getSettings', params);
}

export function registerLoadRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_management/settings/{indexName}',
    method: 'GET',
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { indexName } = request.params;
      try {
        const hit = await fetchSettings(callWithRequest, indexName);
        const response = formatHit(hit);

        reply(response);
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
