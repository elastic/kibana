/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { metricSet } from './metric_set_overview';
import { handleError } from '../../../../lib/errors';
import { getApmClusterStatus } from './_get_apm_cluster_status';

export function apmOverviewRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/apm',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
        }),
        payload: schema.object({
          ccs: schema.maybe(schema.string()),
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
        }),
      },
    },
    async handler(req) {
      const config = server.config;
      const clusterUuid = req.params.clusterUuid;

      const showCgroupMetrics = config.ui.container.apm.enabled;
      if (showCgroupMetrics) {
        const metricCpu = metricSet.find((m) => m.name === 'apm_cpu');
        metricCpu.keys = ['apm_cgroup_cpu'];
      }

      try {
        const [stats, metrics] = await Promise.all([
          getApmClusterStatus(req, { clusterUuid }),
          getMetrics(req, 'beats', metricSet),
        ]);

        return {
          stats,
          metrics,
        };
      } catch (err) {
        return handleError(err, req);
      }
    },
  });
}
