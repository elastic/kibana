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
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { forceStartDatafeeds } = jobServiceProvider(callWithRequest);
      const {
        datafeedIds,
        start,
        end
      } = request.payload;
      return forceStartDatafeeds(datafeedIds, start, end)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/jobs/stop_datafeeds',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { stopDatafeeds } = jobServiceProvider(callWithRequest);
      const { datafeedIds } = request.payload;
      return stopDatafeeds(datafeedIds)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/jobs/delete_jobs',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { deleteJobs } = jobServiceProvider(callWithRequest);
      const { jobIds } = request.payload;
      return deleteJobs(jobIds)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/jobs/close_jobs',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { closeJobs } = jobServiceProvider(callWithRequest);
      const { jobIds } = request.payload;
      return closeJobs(jobIds)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/jobs/jobs_summary',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { jobsSummary } = jobServiceProvider(callWithRequest);
      const { jobIds } = request.payload;
      return jobsSummary(jobIds)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/jobs/jobs_with_timerange',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { jobsWithTimerange } = jobServiceProvider(callWithRequest);
      const { dateFormatTz } = request.payload;
      return jobsWithTimerange(dateFormatTz)
        .catch(resp => {
          wrapError(resp);
        });
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/jobs/jobs',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { createFullJobsList } = jobServiceProvider(callWithRequest);
      const { jobIds } = request.payload;
      return createFullJobsList(jobIds)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/jobs/groups',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { getAllGroups } = jobServiceProvider(callWithRequest);
      return getAllGroups()
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/jobs/update_groups',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { updateGroups } = jobServiceProvider(callWithRequest);
      const { jobs } = request.payload;
      return updateGroups(jobs)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/jobs/deleting_jobs_tasks',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { deletingJobTasks } = jobServiceProvider(callWithRequest);
      return deletingJobTasks()
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

}
