/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';

function deleteWatches(callWithRequest, watchIds) {
  const deletePromises = watchIds.map(watchId => {
    return callWithRequest('watcher.deleteWatch', {
      id: watchId
    })
      .then(success => ({ success }))
      .catch(error => ({ error }));
  });

  return Promise.all(deletePromises)
    .then(results => {
      const successes = results.filter(result => Boolean(result.success));
      const errors = results.filter(result => Boolean(result.error));

      return {
        numSuccesses: successes.length,
        numErrors: errors.length
      };
    });
}

export function registerDeleteRoute(server) {

  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/watcher/watches',
    method: 'DELETE',
    handler: (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);

      return deleteWatches(callWithRequest, request.payload.watchIds)
        .then(results => {
          reply({ results });
        })
        .catch(err => {
          reply(wrapUnknownError(err));
        });
    },
    config: {
      pre: [ licensePreRouting ]
    }
  });
}
