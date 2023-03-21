/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  postClustersRequestPayloadRT,
  postClustersResponsePayloadRT,
} from '../../../../../common/http_api/cluster';
import { getClustersFromRequest } from '../../../../lib/cluster/get_clusters_from_request';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { verifyMonitoringAuth } from '../../../../lib/elasticsearch/verify_monitoring_auth';
import { handleError } from '../../../../lib/errors';
import { MonitoringCore } from '../../../../types';

export function clustersRoute(server: MonitoringCore) {
  /*
   * Monitoring Home
   * Route Init (for checking license and compatibility for multi-cluster monitoring
   */

  const validateBody = createValidationFunction(postClustersRequestPayloadRT);

  // TODO switch from the LegacyServer route() method to the "new platform" route methods
  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters',
    validate: {
      body: validateBody,
    },
    handler: async (req) => {
      // NOTE using try/catch because checkMonitoringAuth is expected to throw
      // an error when current logged-in user doesn't have permission to read
      // the monitoring data. `try/catch` makes it a little more explicit.
      try {
        await verifyMonitoringAuth(req);

        const clusters = await getClustersFromRequest(req, {
          codePaths: req.payload.codePaths,
        });
        return postClustersResponsePayloadRT.encode(clusters);
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
