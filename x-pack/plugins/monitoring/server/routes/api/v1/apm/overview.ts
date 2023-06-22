/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  postApmOverviewRequestParamsRT,
  postApmOverviewRequestPayloadRT,
  postApmOverviewResponsePayloadRT,
} from '../../../../../common/http_api/apm';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { handleError } from '../../../../lib/errors';
import { MonitoringCore } from '../../../../types';
import { metricSet } from './metric_set_overview';
import { getApmClusterStatus } from './_get_apm_cluster_status';

export function apmOverviewRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postApmOverviewRequestParamsRT);
  const validateBody = createValidationFunction(postApmOverviewRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/apm',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    async handler(req) {
      const config = server.config;
      const clusterUuid = req.params.clusterUuid;

      const showCgroupMetrics = config.ui.container.apm.enabled;
      if (showCgroupMetrics) {
        const metricCpu = metricSet.find((m) => m.name === 'apm_cpu');
        if (metricCpu) {
          metricCpu.keys = ['apm_cgroup_cpu'];
        }
      }

      try {
        const [stats, metrics] = await Promise.all([
          getApmClusterStatus(req, { clusterUuid }),
          getMetrics(req, 'beats', metricSet, [
            { term: { 'beats_stats.beat.type': 'apm-server' } },
          ]),
        ]);

        return postApmOverviewResponsePayloadRT.encode({
          stats,
          metrics,
        });
      } catch (err) {
        return handleError(err, req);
      }
    },
  });
}
