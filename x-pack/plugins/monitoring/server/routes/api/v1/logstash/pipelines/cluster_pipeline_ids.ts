/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleError } from '../../../../../lib/errors';
import { getLogstashPipelineIds } from '../../../../../lib/logstash/get_pipeline_ids';
import { MonitoringCore } from '../../../../../types';
import { createValidationFunction } from '../../../../../lib/create_route_validation_function';
import {
  postLogstashPipelineClusterIdsRequestParamsRT,
  postLogstashPipelineClusterIdsRequestPayloadRT,
} from '../../../../../../common/http_api/logstash';

export function logstashClusterPipelineIdsRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postLogstashPipelineClusterIdsRequestParamsRT);
  const validateBody = createValidationFunction(postLogstashPipelineClusterIdsRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash/pipeline_ids',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    async handler(req) {
      const config = server.config;
      const clusterUuid = req.params.clusterUuid;
      const size = config.ui.max_bucket_size;

      try {
        return await getLogstashPipelineIds({ req, clusterUuid, size });
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
