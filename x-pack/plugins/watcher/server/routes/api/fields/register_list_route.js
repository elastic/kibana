/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { Fields } from '../../../models/fields';

function fetchFields(callWithRequest, indexes) {
  const params = {
    index: indexes,
    fields: ['*'],
    ignoreUnavailable: true,
    allowNoIndices: true,
    ignore: 404
  };

  return callWithRequest('fieldCaps', params);
}

export function registerListRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/watcher/fields',
    method: 'POST',
    handler: (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { indexes } = request.payload;

      return fetchFields(callWithRequest, indexes)
        .then(response => {
          const json = (response.status === 404)
            ? { fields: [] }
            : response;

          const fields = Fields.fromUpstreamJson(json);

          reply(fields.downstreamJson);
        })
        .catch(err => {
          // Case: Error from Elasticsearch JS client
          if (isEsError(err)) {
            return reply(wrapEsError(err));
          }

          // Case: default
          reply(wrapUnknownError(err));
        });
    },
    config: {
      pre: [ licensePreRouting ]
    }
  });
}
