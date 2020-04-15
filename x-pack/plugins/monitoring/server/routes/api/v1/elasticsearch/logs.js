/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { handleError } from '../../../../lib/errors/handle_error';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { getLogs } from '../../../../lib/logs/get_logs';

export function logsRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/logs',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
        }),
        payload: schema.object({
          ccs: schema.maybe(schema.string()),
          nodeUuid: schema.maybe(schema.string()),
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
        }),
      },
    },
    async handler(req) {
      const config = server.config();
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const nodeUuid = req.payload.nodeUuid;
      const start = req.payload.timeRange.min;
      const end = req.payload.timeRange.max;
      const filebeatIndexPattern = prefixIndexPattern(
        config,
        config.get('monitoring.ui.logs.index'),
        ccs
      );

      try {
        const logs = await getLogs(config, req, filebeatIndexPattern, {
          clusterUuid,
          nodeUuid,
          start,
          end,
        });
        return { logs };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
