/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { fileDataVisualizerProvider, importDataProvider } from '../models/file_data_visualizer';
import { MAX_BYTES } from '../../common/constants/file_datavisualizer';

import {
  createMlTelemetry,
  getSavedObjectsClient,
  storeMlTelemetry,
  ML_TELEMETRY_DOC_ID,
} from '../lib/ml_telemetry';

function analyzeFiles(callWithRequest, data, overrides) {
  const { analyzeFile } = fileDataVisualizerProvider(callWithRequest);
  return analyzeFile(data, overrides);
}

function importData(callWithRequest, id, index, settings, mappings, ingestPipeline, data) {
  const { importData: importDataFunc } = importDataProvider(callWithRequest);
  return importDataFunc(id, index, settings, mappings, ingestPipeline, data);
}

export function fileDataVisualizerRoutes(server, commonRouteConfig) {
  server.route({
    method: 'POST',
    path: '/api/ml/file_data_visualizer/analyze_file',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const data = request.payload;

      return analyzeFiles(callWithRequest, data, request.query)
        .catch(wrapError);
    },
    config: {
      ...commonRouteConfig,
      payload: { maxBytes: MAX_BYTES },
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/file_data_visualizer/import',
    async handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id } = request.query;
      const { index, data, settings, mappings, ingestPipeline } = request.payload;

      const savedObjectsClient = getSavedObjectsClient(server);
      const mlTelemetrySavedObject = await savedObjectsClient.get(
        'ml-telemetry',
        ML_TELEMETRY_DOC_ID,
      );
      const indicesCount = mlTelemetrySavedObject.attributes.file_data_visualizer_index_creation_count + 1;

      const mlTelemetry = createMlTelemetry(indicesCount);
      storeMlTelemetry(server, mlTelemetry);

      return importData(callWithRequest, id, index, settings, mappings, ingestPipeline, data)
        .catch(wrapError);
    },
    config: {
      ...commonRouteConfig,
      payload: { maxBytes: MAX_BYTES },
    }
  });
}
