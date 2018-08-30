/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { getApmClusterStatus } from './_get_apm_cluster_status';
import { getApms } from '../../../../lib/apm/get_apms';
import { handleError } from '../../../../lib/errors';

export function apmInstancesRoute(server) {
  /**
   * Kibana listing (instances)
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/apm/instances',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required()
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
      const apmIndexPattern = prefixIndexPattern(config, 'xpack.monitoring.beats.index_pattern', ccs);

      try {
        const [ clusterStatus, apms ] = await Promise.all([
          getApmClusterStatus(req, apmIndexPattern, { clusterUuid }),
          getApms(req, apmIndexPattern, { clusterUuid }),
        ]);

        reply({
          clusterStatus,
          apms,
        });
      } catch(err) {
        reply(handleError(err, req));
      }
    }
  });
}
