/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { handleError } from '../../../../lib/errors';
import { getPipeline } from '../../../../lib/logstash/get_pipeline';
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
          ccs: Joi.string().optional()
        })
      }
    },
    handler: (req) => {
      const config = server.config();
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const lsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_LOGSTASH, ccs);

      const pipelineId = req.params.pipelineId;
      // Optional params default to empty string, set to null to be more explicit.
      const pipelineHash = req.params.pipelineHash || null;

      return getPipeline(req, config, lsIndexPattern, clusterUuid, pipelineId, pipelineHash)
        .catch(err => handleError(err, req));
    }
  });
}
