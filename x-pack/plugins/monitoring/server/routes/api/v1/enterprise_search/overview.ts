/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  postEnterpriseSearchOverviewRequestParamsRT,
  postEnterpriseSearchOverviewRequestPayloadRT,
  postEnterpriseSearchOverviewResponsePayloadRT,
} from '../../../../../common/http_api/enterprise_search';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { getStats } from '../../../../lib/enterprise_search';
import { handleError } from '../../../../lib/errors';
import { MonitoringCore } from '../../../../types';
import { metricSet } from './metric_set_overview';

export function entSearchOverviewRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postEnterpriseSearchOverviewRequestParamsRT);
  const validateBody = createValidationFunction(postEnterpriseSearchOverviewRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/enterprise_search',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    async handler(req) {
      const clusterUuid = req.params.clusterUuid;
      try {
        const [stats, metrics] = await Promise.all([
          getStats(req, clusterUuid),
          getMetrics(req, 'enterprise_search', metricSet, [], {
            skipClusterUuidFilter: true,
          }),
        ]);

        return postEnterpriseSearchOverviewResponsePayloadRT.encode({ stats, metrics });
      } catch (err) {
        return handleError(err, req);
      }
    },
  });
}
