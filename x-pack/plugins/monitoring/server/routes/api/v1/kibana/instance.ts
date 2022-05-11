/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getKibanaInfo } from '../../../../lib/kibana/get_kibana_info';
// @ts-ignore
import { handleError } from '../../../../lib/errors';
// @ts-ignore
import { getMetrics } from '../../../../lib/details/get_metrics';
// @ts-ignore
import { metricSet } from './metric_set_instance';
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
        body: schema.object({
          ccs: schema.maybe(schema.string()),
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
        }),
      },
    },
    async handler(req: LegacyRequest) {
      const clusterUuid = req.params.clusterUuid;
      const kibanaUuid = req.params.kibanaUuid;

      try {
        const [metrics, kibanaSummary] = await Promise.all([
          getMetrics(req, 'kibana', metricSet),
          getKibanaInfo(req, { clusterUuid, kibanaUuid }),
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
