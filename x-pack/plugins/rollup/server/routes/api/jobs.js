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
    handler: async (request, reply) => {
      try {
        const callWithRequest = callWithRequestFactory(server, request);
        const results = await callWithRequest('rollup.jobs');
        reply(results);
      } catch(err) {
        if (isEsError(err)) {
          return reply(wrapEsError(err));
        }

        reply(wrapUnknownError(err));
      }
    },
  });

  server.route({
    path: '/api/rollup/create',
    method: 'PUT',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request, reply) => {
      try {
        const {
          id,
          ...rest
        } = request.payload.job;

        const callWithRequest = callWithRequestFactory(server, request);

        // Create job.
        await callWithRequest('rollup.createJob', {
          id,
          body: rest,
        });

        // Then request the newly created job.
        const results = await callWithRequest('rollup.job', { id });
        reply(results.jobs[0]);
      } catch(err) {
        if (isEsError(err)) {
          const boomError = wrapEsError(err);
          return reply(boomError);
        }

        reply(wrapUnknownError(err));
      }
    },
  });

  server.route({
    path: '/api/rollup/start',
    method: 'POST',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request, reply) => {
      try {
        const { jobIds } = request.payload;
        const callWithRequest = callWithRequestFactory(server, request);
        const results = await Promise.all(jobIds.map(id => callWithRequest('rollup.startJob', { id })));

        reply(results);
      } catch(err) {
        if (isEsError(err)) {
          return reply(wrapEsError(err));
        }

        reply(wrapUnknownError(err));
      }
    },
  });

  server.route({
    path: '/api/rollup/stop',
    method: 'POST',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request, reply) => {
      try {
        const { jobIds } = request.payload;
        const callWithRequest = callWithRequestFactory(server, request);
        const results = await Promise.all(jobIds.map(id => callWithRequest('rollup.stopJob', { id })));

        reply(results);
      } catch(err) {
        if (isEsError(err)) {
          return reply(wrapEsError(err));
        }

        reply(wrapUnknownError(err));
      }
    },
  });

  server.route({
    path: '/api/rollup/delete',
    method: 'POST',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request, reply) => {
      try {
        const { jobIds } = request.payload;
        const callWithRequest = callWithRequestFactory(server, request);
        const results = await Promise.all(jobIds.map(id => callWithRequest('rollup.deleteJob', { id })));

        reply(results);
      } catch(err) {
        if (isEsError(err)) {
          return reply(wrapEsError(err));
        }

        reply(wrapUnknownError(err));
      }
    },
  });
}
