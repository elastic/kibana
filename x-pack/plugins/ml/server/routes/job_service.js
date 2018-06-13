/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { jobServiceProvider } from '../models/job_service';

export function jobServiceRoutes(server, commonRouteConfig) {
  server.route({
    method: 'POST',
    path: '/api/ml/jobs/force_start_datafeeds',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { forceStartDatafeeds } = jobServiceProvider(callWithRequest);
      const {
        datafeedIds,
        start,
        end
      } = request.payload;
      return forceStartDatafeeds(datafeedIds, start, end)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/jobs/stop_datafeeds',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { stopDatafeeds } = jobServiceProvider(callWithRequest);
      const { datafeedIds } = request.payload;
      return stopDatafeeds(datafeedIds)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

}
