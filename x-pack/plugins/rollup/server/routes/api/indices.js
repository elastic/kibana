/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';
import { getIndexNameToCapabilitiesMap } from '../../lib/map_capabilities';

export function registerIndicesRoute(server) {
  const isEsError = isEsErrorFactory(server);

  server.route({
    path: '/api/rollup/indices',
    method: 'GET',
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);
      try {
        const capabilities = await callWithRequest('rollup.capabilities', {
          indices: '_all'
        });
        reply(getIndexNameToCapabilitiesMap(capabilities));
      } catch(err) {
        if (isEsError(err)) {
          return reply(wrapEsError(err));
        }
        reply(wrapUnknownError(err));
      }
    },
    // config: {
    //   pre: [ licensePreRouting ]
    // }
  });
}
