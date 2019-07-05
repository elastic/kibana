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

async function unfreezeIndices(callWithRequest, indices) {
  const params = {
    path: `/${encodeURIComponent(indices.join(','))}/_unfreeze`,
    method: 'POST',
  };

  return await callWithRequest('transport.request', params);
}

export function registerUnfreezeRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_management/indices/unfreeze',
    method: 'POST',
    handler: async (request, h) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const indices = getIndexArrayFromPayload(request.payload);

      try {
        await unfreezeIndices(callWithRequest, indices);
        return h.response();
      } catch (err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }

        throw wrapUnknownError(err);
      }
    },
    config: {
      pre: [ licensePreRouting ]
    }
  });
}
