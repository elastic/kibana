/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';

function formatHits(hits) {
  return Object.keys(hits).reduce((accum, lifecycleName) => {
    const hit = hits[lifecycleName];
    accum.push({
      ...hit,
      name: lifecycleName,
    });
    return accum;
  }, []);
}

async function fetchPolicies(callWithRequest) {
  const params = {
    method: 'GET',
    path: '/_xpack/index_lifecycle',
    // we allow 404 incase the user shutdown security in-between the check and now
    ignore: [ 404 ]
  };

  return await callWithRequest('transport.request', params);
}

export function registerFetchRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_lifecycle_management/policies',
    method: 'GET',
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const hits = await fetchPolicies(callWithRequest);
        const response = formatHits(hits);
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
