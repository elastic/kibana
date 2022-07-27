/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getClusterStatus } from '../../../../lib/logstash/get_cluster_status';
import { getNodes } from '../../../../lib/logstash/get_nodes';
import { handleError } from '../../../../lib/errors';
import { MonitoringCore } from '../../../../types';
import {
  postLogstashNodesRequestParamsRT,
  postLogstashNodesRequestPayloadRT,
} from '../../../../../common/http_api/logstash/post_logstash_nodes';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';

export function logstashNodesRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postLogstashNodesRequestParamsRT);
  const validateBody = createValidationFunction(postLogstashNodesRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash/nodes',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    async handler(req) {
      const clusterUuid = req.params.clusterUuid;

      try {
        const [clusterStatus, nodes] = await Promise.all([
          getClusterStatus(req, { clusterUuid }),
          getNodes(req, { clusterUuid }),
        ]);

        return {
          clusterStatus,
          nodes,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
