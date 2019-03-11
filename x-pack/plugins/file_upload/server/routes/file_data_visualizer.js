/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { importDataProvider } from '../models/file_data_visualizer';
import { MAX_BYTES } from '../../common/constants/file_datavisualizer';


function importData(callWithRequest, id, index, settings, mappings, ingestPipeline, data) {
  const { importData: importDataFunc } = importDataProvider(callWithRequest);
  return importDataFunc(id, index, settings, mappings, ingestPipeline, data);
}

export function fileDataVisualizerRoutes(server, commonRouteConfig) {
  server.route({
    method: 'POST',
    path: '/api/fileupload/import',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id } = request.query;
      const { index, data, settings, mappings, ingestPipeline } = request.payload;

      return importData(callWithRequest, id, index, settings, mappings, ingestPipeline, data)
        .catch(wrapError);
    },
    config: {
      ...commonRouteConfig,
      payload: { maxBytes: MAX_BYTES },
    }
  });
}
