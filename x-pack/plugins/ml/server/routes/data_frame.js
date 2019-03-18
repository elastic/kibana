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

}
