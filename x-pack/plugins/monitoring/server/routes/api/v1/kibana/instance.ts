/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { getKibanaInfo } from '../../../../lib/kibana/get_kibana_info';
// @ts-ignore
import { handleError } from '../../../../lib/errors';
// @ts-ignore
import { getMetrics } from '../../../../lib/details/get_metrics';
// @ts-ignore
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
// @ts-ignore
import { metricSet } from './metric_set_instance';
import { INDEX_PATTERN_KIBANA } from '../../../../../common/constants';
import { LegacyRequest, LegacyServer } from '../../../../types';

/**
 * Kibana instance: This will fetch all data required to display a Kibana
 * instance's page. The current details returned are:
 * - Kibana Instance Summary (Status)
 * - Metrics
 */
export function kibanaInstanceRoute(server: LegacyServer) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/kibana/{kibanaUuid}',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
          kibanaUuid: schema.string(),
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
    async handler(req: LegacyRequest) {
      const config = server.config();
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const kibanaUuid = req.params.kibanaUuid;
      const kbnIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_KIBANA, ccs);

      try {
        const [metrics, kibanaSummary] = await Promise.all([
          getMetrics(req, kbnIndexPattern, metricSet),
          getKibanaInfo(req, kbnIndexPattern, { clusterUuid, kibanaUuid }),
        ]);

        return {
          metrics,
          kibanaSummary,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
