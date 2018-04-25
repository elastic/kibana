/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { handleError } from '../../../../lib/errors';
import { getPipeline } from '../../../../lib/logstash/get_pipeline';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';

/*
 * Logstash Pipeline route.
 */
export function logstashPipelineRoute(server) {
  /**
   * Logtash Pipeline Viewer request.
   *
   * This will fetch all data required to display a Logstash Pipeline Viewer page.
   *
   * The current details returned are:
   *
   * - Pipeline Metrics
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash/pipeline/{pipelineId}/{pipelineHash?}',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required(),
          pipelineId: Joi.string().required(),
          pipelineHash: Joi.string().optional()
        }),
        payload: Joi.object({
          ccs: Joi.string().optional()
        })
      }
    },
    handler: (req, reply) => {
      const config = server.config();
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const lsIndexPattern = prefixIndexPattern(config, 'xpack.monitoring.logstash.index_pattern', ccs);

      const pipelineId = req.params.pipelineId;
      const pipelineHash = req.params.pipelineHash;

      return getPipeline(req, config, lsIndexPattern, clusterUuid, pipelineId, pipelineHash)
        .then(reply)
        .catch(err => reply(handleError(err, req)));
    }
  });
}
