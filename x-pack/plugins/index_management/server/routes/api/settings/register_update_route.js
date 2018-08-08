/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';


async function updateSettings(callWithRequest, indexName, settings) {
  const params = {
    ignoreUnavailable: true,
    allowNoIndices: false,
    expandWildcards: 'none',
    index: indexName,
    body: settings
  };

  return await callWithRequest('indices.putSettings', params);
}

export function registerUpdateRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_management/settings/{indexName}',
    method: 'PUT',
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { indexName } = request.params;
      try {
        const response = await updateSettings(callWithRequest, indexName, request.payload);
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
