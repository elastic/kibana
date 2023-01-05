/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  postClusterRequestParamsRT,
  postClusterRequestPayloadRT,
  postClusterResponsePayloadRT,
} from '../../../../../common/http_api/cluster';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { getClustersFromRequest } from '../../../../lib/cluster/get_clusters_from_request';
import { handleError } from '../../../../lib/errors';
import { MonitoringCore } from '../../../../types';

export function clusterRoute(server: MonitoringCore) {
  /*
   * Cluster Overview
   */

  const validateParams = createValidationFunction(postClusterRequestParamsRT);
  const validateBody = createValidationFunction(postClusterRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    handler: async (req) => {
      const options = {
        clusterUuid: req.params.clusterUuid,
        start: req.payload.timeRange.min,
        end: req.payload.timeRange.max,
        codePaths: req.payload.codePaths,
      };

      try {
        const clusters = await getClustersFromRequest(req, options);
        return postClusterResponsePayloadRT.encode(clusters);
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
