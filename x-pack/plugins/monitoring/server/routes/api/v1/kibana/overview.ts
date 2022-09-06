/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKibanaClusterStatus } from './_get_kibana_cluster_status';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { metricSet } from './metric_set_overview';
import { handleError } from '../../../../lib/errors';
import {
  postKibanaOverviewRequestParamsRT,
  postKibanaOverviewRequestPayloadRT,
  postKibanaOverviewResponsePayloadRT,
} from '../../../../../common/http_api/kibana';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { MonitoringCore } from '../../../../types';

export function kibanaOverviewRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postKibanaOverviewRequestParamsRT);
  const validateBody = createValidationFunction(postKibanaOverviewRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/kibana',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    async handler(req) {
      const clusterUuid = req.params.clusterUuid;

      try {
        const moduleType = 'kibana';
        const dsDataset = 'stats';
        const [clusterStatus, metrics] = await Promise.all([
          getKibanaClusterStatus(req, { clusterUuid }),
          getMetrics(req, moduleType, metricSet, [
            {
              bool: {
                should: [
                  { term: { 'data_stream.dataset': `${moduleType}.${dsDataset}` } },
                  { term: { 'metricset.name': dsDataset } },
                  { term: { type: 'kibana_stats' } },
                ],
              },
            },
          ]),
        ]);

        return postKibanaOverviewResponsePayloadRT.encode({
          clusterStatus,
          metrics,
        });
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
