/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { handleError } from '../../../../../lib/errors';
import { getLogstashPipelineIds } from '../../../../../lib/logstash/get_pipeline_ids';

/**
 * Retrieve pipelines for a cluster
 */
export function logstashClusterPipelineIdsRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash/pipeline_ids',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
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
    handler: async (req) => {
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
