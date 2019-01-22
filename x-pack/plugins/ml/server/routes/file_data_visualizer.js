/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { fileDataVisualizerProvider, importDataProvider } from '../models/file_data_visualizer';
import { INDEX_META_DATA_CREATED_BY, MAX_BYTES } from '../../common/constants/file_datavisualizer';

import {
  createMlTelementry,
  storeMlTelemetry
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

      // Store telemetry data (count of indices created by file_data_visualizer)
      const allMappings = await callWithRequest('indices.getMapping');

      const indicesCount = Object.keys(allMappings).reduce((count, mappingKey) => {
        const mapping = allMappings[mappingKey];
        const createdBy = get(mapping, 'mappings._meta.created_by');
        if (createdBy === INDEX_META_DATA_CREATED_BY) {
          count++;
        }
        return count;
      }, 0);

      const mlTelemetry = createMlTelementry(indicesCount);
      console.warn('mlTelemetry', mlTelemetry);
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
