/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { prefixIndexPattern } from '../../../../../common/ccs_utils';
import { getBeatSummary } from '../../../../lib/beats';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { handleError } from '../../../../lib/errors';
import { metricSet } from './metric_set_detail';
import { INDEX_PATTERN_BEATS } from '../../../../../common/constants';

export function beatsDetailRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/beats/beat/{beatUuid}',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
          beatUuid: schema.string(),
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
      const clusterUuid = req.params.clusterUuid;
      const beatUuid = req.params.beatUuid;
      const config = server.config;
      const ccs = req.payload.ccs;
      const beatsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_BEATS, ccs);

      const summaryOptions = {
        clusterUuid,
        beatUuid,
        start: req.payload.timeRange.min,
        end: req.payload.timeRange.max,
      };

      try {
        const [summary, metrics] = await Promise.all([
          getBeatSummary(req, beatsIndexPattern, summaryOptions),
          getMetrics(req, 'beats', metricSet, [{ term: { 'beats_stats.beat.uuid': beatUuid } }]),
        ]);

        return {
          summary,
          metrics,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
