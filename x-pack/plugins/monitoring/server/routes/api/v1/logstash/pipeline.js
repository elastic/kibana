/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { handleError } from '../../../../lib/errors';
import { getPipeline } from '../../../../lib/logstash/get_pipeline';
import { getPipelineVertex } from '../../../../lib/logstash/get_pipeline_vertex';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { INDEX_PATTERN_LOGSTASH } from '../../../../../common/constants';

/*
 * Logstash Pipeline route.
 */
export function logstashPipelineRoute(server) {
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
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash/pipeline/{pipelineId}/{pipelineHash?}',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required(),
          pipelineId: Joi.string().required(),
          pipelineHash: Joi.string().optional()
        }),
        payload: Joi.object({
          ccs: Joi.string().optional(),
          detailVertexId: Joi.string().optional()
        })
      }
    },
    handler: async (req) => {
      const config = server.config();
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const detailVertexId = req.payload.detailVertexId;
      const lsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_LOGSTASH, ccs);

      const pipelineId = req.params.pipelineId;
      // Optional params default to empty string, set to null to be more explicit.
      const pipelineHash = req.params.pipelineHash || null;

      const promises = [ getPipeline(req, config, lsIndexPattern, clusterUuid, pipelineId, pipelineHash) ];
      if (detailVertexId) {
        promises.push(getPipelineVertex(req, config, lsIndexPattern, clusterUuid, pipelineId, pipelineHash, detailVertexId));
      }

      try {
        const [ pipeline, vertex ] = await Promise.all(promises);
        return {
          ...pipeline,
          ...vertex
        };
      } catch (err) {
        return handleError(err, req);
      }
    }
  });
}
