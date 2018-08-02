/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { getApmInfo } from '../../../../lib/apm/get_apm_info';
import { handleError } from '../../../../lib/errors';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { metricSet } from './metric_set_instance';

/**
 * Kibana instance: This will fetch all data required to display a Kibana
 * instance's page. The current details returned are:
 * - Kibana Instance Summary (Status)
 * - Metrics
 */
export function apmInstanceRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/apm/{apmUuid}',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required(),
          apmUuid: Joi.string().required()
        }),
        payload: Joi.object({
          ccs: Joi.string().optional(),
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required()
          }).required()
        })
      }
    },
    async handler(req, reply) {
      const config = server.config();
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const apmUuid = req.params.apmUuid;
      const apmIndexPattern = prefixIndexPattern(config, 'xpack.monitoring.beats.index_pattern', ccs);

      try {
        const [ metrics, apmSummary ] = await Promise.all([
          getMetrics(req, apmIndexPattern, metricSet),
          getApmInfo(req, apmIndexPattern, { clusterUuid, apmUuid }),
        ]);

        reply({
          metrics,
          apmSummary,
        });
      } catch (err) {
        reply(handleError(err, req));
      }
    }
  });
}
