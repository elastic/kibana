/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../lib/license_pre_routing_factory';
import { getCapabilitiesForRollupIndices } from '../../lib/map_capabilities';

/**
 * Returns a list of all rollup index names
 */
export function registerIndicesRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/rollup/indices',
    method: 'GET',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);
      try {
        const data = await callWithRequest('rollup.capabilitiesByRollupIndex', {
          indexPattern: '_all'
        });
        reply(getCapabilitiesForRollupIndices(data));
      } catch(err) {
        if (isEsError(err)) {
          return reply(wrapEsError(err));
        }
        reply(wrapUnknownError(err));
      }
    }
  });
}
