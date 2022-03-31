/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { prefixIndexPattern } from '../../../../../common/ccs_utils';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { getLatestStats, getStats } from '../../../../lib/beats';
import { handleError } from '../../../../lib/errors';
import { metricSet } from './metric_set_overview';
import { INDEX_PATTERN_BEATS } from '../../../../../common/constants';

export function beatsOverviewRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/beats',
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
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const beatsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_BEATS, ccs);

      try {
        const [latest, stats, metrics] = await Promise.all([
          getLatestStats(req, beatsIndexPattern, clusterUuid),
          getStats(req, beatsIndexPattern, clusterUuid),
          getMetrics(req, 'beats', metricSet),
        ]);

        return {
          ...latest,
          stats,
          metrics,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
