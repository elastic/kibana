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

  server.route({
    method: 'POST',
    path: '/api/ml/jobs/delete_jobs',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { deleteJobs } = jobServiceProvider(callWithRequest);
      const { jobIds } = request.payload;
      return deleteJobs(jobIds)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/jobs/close_jobs',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { closeJobs } = jobServiceProvider(callWithRequest);
      const { jobIds } = request.payload;
      return closeJobs(jobIds)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/jobs/jobs_summary',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { jobsSummary } = jobServiceProvider(callWithRequest);
      const { jobIds } = request.payload;
      return jobsSummary(jobIds)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/jobs/jobs',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { createFullJobsList } = jobServiceProvider(callWithRequest);
      const { jobIds } = request.payload;
      return createFullJobsList(jobIds)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/jobs/groups',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { getAllGroups } = jobServiceProvider(callWithRequest);
      return getAllGroups()
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

}
