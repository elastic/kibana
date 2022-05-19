/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegacyRequest, MonitoringCore } from '../../../../types';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { getHealthRequestQueryRT } from '../../../../../common/http_api/_health';
import { TimeRange } from '../../../../../common/http_api/shared';

import { fetchMonitoredClusters } from './monitored_clusters';

export function health(server: MonitoringCore) {
  const validateQuery = createValidationFunction(getHealthRequestQueryRT);

  server.route({
    method: 'get',
    path: '/api/monitoring/v1/_health',
    validate: {
      query: validateQuery,
    },
    async handler(req: LegacyRequest) {
      const index = '*:.monitoring-*,.monitoring-*';
      const timeRange = {
        min: req.query.min || 'now-30m',
        max: req.query.max || 'now',
      } as TimeRange;
      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

      const monitoredClusters = await fetchMonitoredClusters({
        index,
        timeRange,
        search: (params: any) => callWithRequest(req, 'search', params),
      });

      return { monitoredClusters };
    },
  });
}
