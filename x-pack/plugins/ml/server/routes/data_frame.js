/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { callWithRequestFactory } from '../client/call_with_request_factory';

export function dataFrameRoutes(server, commonRouteConfig) {

  server.route({
    method: 'GET',
    path: '/api/ml/_data_frame/transforms',
    async handler(request) {
      try {
        const callWithRequest = callWithRequestFactory(server, request);
        return await callWithRequest('ml.getDataFrameTransforms');
      } catch (error) {
        return Boom.badRequest(error.message || error);
      }
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/_data_frame/transforms/_stats',
    async handler(request) {
      try {
        const callWithRequest = callWithRequestFactory(server, request);
        return await callWithRequest('ml.getDataFrameTransformsStats');
      } catch (error) {
        return Boom.badRequest(error.message || error);
      }
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/_data_frame/transforms/{jobId}/_stats',
    async handler(request) {
      try {
        const callWithRequest = callWithRequestFactory(server, request);
        const { jobId } = request.params;
        return await callWithRequest('ml.getDataFrameTransformsStats', { jobId });
      } catch (error) {
        return Boom.badRequest(error.message || error);
      }
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'PUT',
    path: '/api/ml/_data_frame/transforms/{jobId}',
    async handler(request) {
      try {
        const callWithRequest = callWithRequestFactory(server, request);
        const { jobId } = request.params;
        return await callWithRequest('ml.createDataFrameTransformsJob', { body: request.payload, jobId });
      } catch (error) {
        return Boom.badRequest(error.message || error);
      }
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'DELETE',
    path: '/api/ml/_data_frame/transforms/{jobId}',
    async handler(request) {
      try {
        const callWithRequest = callWithRequestFactory(server, request);
        const { jobId } = request.params;
        return await callWithRequest('ml.deleteDataFrameTransformsJob', { jobId });
      } catch (error) {
        return Boom.badRequest(error.message || error);
      }
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/_data_frame/transforms/_preview',
    async handler(request) {
      try {
        const callWithRequest = callWithRequestFactory(server, request);
        return await callWithRequest('ml.getDataFrameTransformsPreview', { body: request.payload });
      } catch (error) {
        return Boom.badRequest(error.message || error);
      }
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/_data_frame/transforms/{jobId}/_start',
    async handler(request) {
      try {
        const callWithRequest = callWithRequestFactory(server, request);
        const { jobId } = request.params;
        return await callWithRequest('ml.startDataFrameTransformsJob', { jobId });
      } catch (error) {
        return Boom.badRequest(error.message || error);
      }
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/_data_frame/transforms/{jobId}/_stop',
    async handler(request) {
      try {
        const callWithRequest = callWithRequestFactory(server, request);
        const options = {
          jobId: request.params.jobId
        };
        const force = request.query.force;
        if (force !== undefined) {
          options.force = force;
        }
        return await callWithRequest('ml.stopDataFrameTransformsJob', options);
      } catch (error) {
        return Boom.badRequest(error.message || error);
      }
    },
    config: {
      ...commonRouteConfig
    }
  });

}
