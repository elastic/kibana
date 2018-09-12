/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { metricSet } from './metric_set_overview';
import { handleError } from '../../../../lib/errors';

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
      const beatUuid = req.params.beatUuid;
      const config = server.config();
      const ccs = req.payload.ccs;
      const beatsIndexPattern = prefixIndexPattern(config, 'xpack.monitoring.beats.index_pattern', ccs);

      try {
        const [ metrics ] = await Promise.all([
          getMetrics(req, beatsIndexPattern, metricSet, [{ term: { 'beats_stats.beat.uuid': beatUuid } }]),
        ]);

        reply({
          metrics,
        });
      } catch (err) {
        reply(handleError(err, req));
      }
    }
  });
}
