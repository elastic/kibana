/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { prefixIndexPattern } from '../../../../../common/ccs_utils';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { metricSet } from './metric_set_overview';
import { handleError } from '../../../../lib/errors';
import { INDEX_PATTERN_ENTERPRISE_SEARCH } from '../../../../../common/constants';
import { getStats } from '../../../../lib/enterprise_search';

export function entSearchOverviewRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/enterprise_search',
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
      const clusterUuid = req.params.clusterUuid;
      const entSearchIndexPattern = prefixIndexPattern(
        server.config(),
        INDEX_PATTERN_ENTERPRISE_SEARCH,
        req.payload.ccs
      );

      try {
        const [stats, metrics] = await Promise.all([
          getStats(req, entSearchIndexPattern, clusterUuid),
          getMetrics(req, entSearchIndexPattern, metricSet, [], {
            skipClusterUuidFilter: true,
          }),
        ]);

        return { stats, metrics };
      } catch (err) {
        return handleError(err, req);
      }
    },
  });
}
