/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { get } from 'lodash';
import { Watch } from '../../../models/watch';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';

function fetchWatch(callWithRequest, watchId) {
  return callWithRequest('watcher.getWatch', {
    id: watchId
  });
}

export function registerLoadRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/watcher/watch/{id}',
    method: 'GET',
    handler: (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);

      const id = request.params.id;

      return fetchWatch(callWithRequest, id)
        .then(hit => {
          const watchJson = get(hit, 'watch');
          const watchStatusJson = get(hit, 'status');
          const json = {
            id,
            watchJson,
            watchStatusJson,
          };

          const watch = Watch.fromUpstreamJson(json, {
            throwExceptions: {
              Action: false,
            },
          });

          reply({ watch: watch.downstreamJson });
        })
        .catch(err => {
          // Case: Error from Elasticsearch JS client
          if (isEsError(err)) {
            const statusCodeToMessageMap = {
              404: `Watch with id = ${id} not found`,
            };
            return reply(wrapEsError(err, statusCodeToMessageMap));
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
