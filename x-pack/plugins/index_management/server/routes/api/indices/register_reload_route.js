/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';
import { fetchIndices } from '../../../lib/fetch_indices';
function getIndexNamesFromPayload(payload) {
  return payload.indexNames || [];
}

export function registerReloadRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_management/indices/reload',
    method: 'POST',
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const indexNames = getIndexNamesFromPayload(request.payload);
      return await fetchIndices(callWithRequest, isEsError, indexNames);
    },
    config: {
      pre: [ licensePreRouting ]
    }
  });
}
