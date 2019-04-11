/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { dataFrameServiceProvider } from '../models/data_frame_service';

export function dataFrameRoutes(server, commonRouteConfig) {

  server.route({
    method: 'GET',
    path: '/api/ml/_data_frame/transforms',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { getDataFrameTransforms } = dataFrameServiceProvider(callWithRequest);
      return getDataFrameTransforms()
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/_data_frame/transforms/_stats',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { getDataFrameTransformsStats } = dataFrameServiceProvider(callWithRequest);
      return getDataFrameTransformsStats()
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'PUT',
    path: '/api/ml/_data_frame/transforms/{jobId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { createDataFrameTransformsJob } = dataFrameServiceProvider(callWithRequest);
      const { jobId } = request.params;
      return createDataFrameTransformsJob(jobId, request.payload)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'DELETE',
    path: '/api/ml/_data_frame/transforms/{jobId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { deleteDataFrameTransformsJob } = dataFrameServiceProvider(callWithRequest);
      const { jobId } = request.params;
      return deleteDataFrameTransformsJob(jobId)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/_data_frame/transforms/_preview',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { getDataFrameTransformsPreview } = dataFrameServiceProvider(callWithRequest);
      return getDataFrameTransformsPreview(request.payload)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/_data_frame/transforms/{jobId}/_start',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { startDataFrameTransformsJob } = dataFrameServiceProvider(callWithRequest);
      const { jobId } = request.params;
      return startDataFrameTransformsJob(jobId)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/_data_frame/transforms/{jobId}/_stop',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { stopDataFrameTransformsJob } = dataFrameServiceProvider(callWithRequest);
      const { jobId } = request.params;
      return stopDataFrameTransformsJob(jobId)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

}
