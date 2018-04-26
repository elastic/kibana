/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { Watch } from '../../../models/watch';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';

function saveWatch(callWithRequest, watch) {
  return callWithRequest('watcher.putWatch', {
    id: watch.id,
    body: watch.watch
  });
}

export function registerSaveRoute(server) {

  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/watcher/watch/{id}',
    method: 'PUT',
    handler: (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);

      const watch = Watch.fromDownstreamJson(request.payload);

      return saveWatch(callWithRequest, watch.upstreamJson)
        .then(reply)
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
