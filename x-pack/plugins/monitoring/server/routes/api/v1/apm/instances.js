/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { prefixIndexPatternWithCcs } from '../../../../../common/ccs_utils';
import { getStats, getApms } from '../../../../lib/apm';
import { handleError } from '../../../../lib/errors';
import { INDEX_PATTERN_BEATS } from '../../../../../common/constants';

export function apmInstancesRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/apm/instances',
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
      const apmIndexPattern = prefixIndexPatternWithCcs(config, INDEX_PATTERN_BEATS, ccs);

      try {
        const [stats, apms] = await Promise.all([
          getStats(req, apmIndexPattern, clusterUuid),
          getApms(req, apmIndexPattern, clusterUuid),
        ]);

        return {
          stats,
          apms,
          cgroup: config.ui.container.apm.enabled,
        };
      } catch (err) {
        return handleError(err, req);
      }
    },
  });
}
