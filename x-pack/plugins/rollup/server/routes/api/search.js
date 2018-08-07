/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';

export function registerSearchRoute(server) {
  const isEsError = isEsErrorFactory(server);

  server.route({
    path: '/api/rollup/search',
    method: 'POST',
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const results = [];

        for (let i = 0; i < request.payload.length; i++) {
          const { index, query } = request.payload[i];
          results.push(await callWithRequest('rollup.search', {
            index,
            body: query,
          }));
        }

        reply(results);
      } catch(err) {
        if (isEsError(err)) {
          return reply(wrapEsError(err));
        }

        reply(wrapUnknownError(err));
      }
    },
  });
}
