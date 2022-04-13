/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getNodeInfo } from '../../../../lib/logstash/get_node_info';
import { handleError } from '../../../../lib/errors';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { metricSets } from './metric_set_node';

const { advanced: metricSetAdvanced, overview: metricSetOverview } = metricSets;

/*
 * Logstash Node route.
 */
export function logstashNodeRoute(server) {
  /**
   * Logstash Node request.
   *
   * This will fetch all data required to display a Logstash Node page.
   *
   * The current details returned are:
   *
   * - Logstash Node Summary (Status)
   * - Metrics
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash/node/{logstashUuid}',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
          logstashUuid: schema.string(),
        }),
        payload: schema.object({
          ccs: schema.maybe(schema.string()),
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
          is_advanced: schema.boolean(),
        }),
      },
    },
    async handler(req) {
      const config = server.config;
      const clusterUuid = req.params.clusterUuid;
      const logstashUuid = req.params.logstashUuid;

      let metricSet;
      if (req.payload.is_advanced) {
        metricSet = metricSetAdvanced;
      } else {
        metricSet = metricSetOverview;
        // set the cgroup option if needed
        const showCgroupMetricsLogstash = config.ui.container.logstash.enabled;
        const metricCpu = metricSet.find((m) => m.name === 'logstash_node_cpu_metric');
        if (showCgroupMetricsLogstash) {
          metricCpu.keys = ['logstash_node_cgroup_quota_as_cpu_utilization'];
        } else {
          metricCpu.keys = ['logstash_node_cpu_utilization'];
        }
      }

      try {
        const moduleType = 'logstash';
        const dsDataset = 'node_stats';
        const [metrics, nodeSummary] = await Promise.all([
          getMetrics(req, 'logstash', metricSet, [
            {
              bool: {
                should: [
                  { term: { 'data_stream.dataset': `${moduleType}.${dsDataset}` } },
                  { term: { 'metricset.name': dsDataset } },
                  { term: { type: 'logstash_stats' } },
                ],
              },
            },
          ]),
          getNodeInfo(req, { clusterUuid, logstashUuid }),
        ]);

        return {
          metrics,
          nodeSummary,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
