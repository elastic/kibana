/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { licensePreRoutingFactory } from'../../lib/license_pre_routing_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';

export function registerJobsRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/rollup/jobs',
    method: 'GET',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      try {
        const callWithRequest = callWithRequestFactory(server, request);
        return await callWithRequest('xpack.rollup.getJobs', { id: '_all' });
      } catch(err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
  });

  server.route({
    path: '/api/rollup/create',
    method: 'PUT',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      try {
        const {
          id,
          ...rest
        } = request.payload.job;

        const callWithRequest = callWithRequestFactory(server, request);

        // Create job.
        await callWithRequest('xpack.rollup.putJob', {
          id,
          body: rest,
        });

        // Then request the newly created job.
        const results = await callWithRequest('xpack.rollup.getJobs', { id });
        return results.jobs[0];
      } catch(err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
  });

  server.route({
    path: '/api/rollup/start',
    method: 'POST',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      try {
        const { jobIds } = request.payload;
        const callWithRequest = callWithRequestFactory(server, request);
        return await Promise.all(jobIds.map(id => callWithRequest('xpack.rollup.startJob', { id })));
      } catch(err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
  });

  server.route({
    path: '/api/rollup/stop',
    method: 'POST',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      try {
        const { jobIds } = request.payload;
        const callWithRequest = callWithRequestFactory(server, request);
        return await Promise.all(jobIds.map(id => callWithRequest('xpack.rollup.stopJob', { id })));
      } catch(err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
  });

  server.route({
    path: '/api/rollup/delete',
    method: 'POST',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      try {
        const { jobIds } = request.payload;
        const callWithRequest = callWithRequestFactory(server, request);
        return await Promise.all(jobIds.map(id => callWithRequest('xpack.rollup.deleteJob', { id })));
      } catch(err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
  });
}
