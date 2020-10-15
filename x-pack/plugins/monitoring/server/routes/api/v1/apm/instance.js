/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { metricSet } from './metric_set_instance';
import { handleError } from '../../../../lib/errors';
import { getApmInfo } from '../../../../lib/apm';
import { INDEX_PATTERN_BEATS } from '../../../../../common/constants';

export function apmInstanceRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/apm/{apmUuid}',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
          apmUuid: schema.string(),
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
      const apmUuid = req.params.apmUuid;
      const config = server.config();
      const clusterUuid = req.params.clusterUuid;
      const ccs = req.payload.ccs;
      const apmIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_BEATS, ccs);

      try {
        const [metrics, apmSummary] = await Promise.all([
          getMetrics(req, apmIndexPattern, metricSet, [
            { term: { 'beats_stats.beat.uuid': apmUuid } },
          ]),
          getApmInfo(req, apmIndexPattern, { clusterUuid, apmUuid }),
        ]);

        return {
          metrics,
          apmSummary,
        };
      } catch (err) {
        return handleError(err, req);
      }
    },
  });
}
