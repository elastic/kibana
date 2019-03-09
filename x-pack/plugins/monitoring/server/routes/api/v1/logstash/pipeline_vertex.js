/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { handleError } from '../../../../lib/errors';
import { getPipelineVertex } from '../../../../lib/logstash/get_pipeline_vertex';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { INDEX_PATTERN_LOGSTASH } from '../../../../../common/constants';

/*
 * Logstash Pipeline route.
 */
export function logstashPipelineVertexRoute(server) {
  /**
   * Logstash Pipeline Viewer request.
   *
   * This will fetch all data required to display a Logstash Pipeline Viewer page.
   *
   * The current details returned are:
   *
   * - Pipeline Metrics
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash/pipeline/{pipelineId}/{pipelineHash}/vertex/{vertexId}',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required(),
          pipelineId: Joi.string().required(),
          pipelineHash: Joi.string().required(),
          vertexId: Joi.string().required()
        }),
        payload: Joi.object({
          ccs: Joi.string().optional()
        })
      }
    },
    handler: (req) => {
      const config = server.config();
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const lsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_LOGSTASH, ccs);

      const { pipelineId, pipelineHash, vertexId } = req.params;

      return getPipelineVertex(req, config, lsIndexPattern, clusterUuid, pipelineId, pipelineHash, vertexId)
        .catch(err => handleError(err, req));
    }
  });
}
