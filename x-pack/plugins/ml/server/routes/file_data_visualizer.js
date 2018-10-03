/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { fileDataVisualizerProvider } from '../models/file_data_visualizer';
import { MAX_BYTES } from '../../common/constants/file_datavisualizer';

function analyzeFiles(callWithRequest, data, overrides) {
  const { analyzeFile } = fileDataVisualizerProvider(callWithRequest);
  return analyzeFile(data, overrides);
}

export function fileDataVisualizerRoutes(server, commonRouteConfig) {
  server.route({
    method: 'POST',
    path: '/api/ml/file_data_visualizer/analyze_file',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const data = request.payload;

      return analyzeFiles(callWithRequest, data, request.query)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig,
      payload: { maxBytes: MAX_BYTES },
      timeout: { socket: false, server: (1200000) },
    }
  });
}
