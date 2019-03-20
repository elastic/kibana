/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { importDataProvider } from '../models/file_data_visualizer';
import { MAX_BYTES } from '../../common/constants/file_import';
import { updateTelemetry } from '../telemetry/telemetry';


function importData(callWithRequest, id, index, settings, mappings, ingestPipeline, data) {
  const { importData: importDataFunc } = importDataProvider(callWithRequest);
  return importDataFunc(id, index, settings, mappings, ingestPipeline, data);
}

export function fileUploadRoutes(server, commonRouteConfig) {

  server.route({
    method: 'POST',
    path: '/api/fileupload/import',
    async handler(request) {

      const { savedObjects: { getSavedObjectsRepository } } = server;
      const { callWithInternalUser } =
        server.plugins.elasticsearch.getCluster('data');
      const internalRepository = getSavedObjectsRepository(callWithInternalUser);
      const { index, data, settings, mappings, ingestPipeline, app, fileType }
        = request.payload;

      // `id` being `undefined` tells us that this is a new import due to create a new index.
      // follow-up import calls to just add additional data will include the `id` of the created
      // index, we'll ignore those and don't increment the counter.
      const { id } = request.query;
      if (id === undefined) {
        await updateTelemetry(internalRepository, app, fileType);
      }

      const callWithRequest = callWithRequestFactory(server, request);
      return importData(callWithRequest, id, index, settings, mappings, ingestPipeline, data)
        .catch(wrapError);
    },
    config: {
      ...commonRouteConfig,
      payload: { maxBytes: MAX_BYTES },
    }
  });
}
