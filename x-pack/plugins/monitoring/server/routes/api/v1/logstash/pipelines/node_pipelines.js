/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { getNodeInfo } from '../../../../../lib/logstash/get_node_info';
import { getPipelines, processPipelinesAPIResponse } from '../../../../../lib/logstash/get_pipelines';
import { handleError } from '../../../../../lib/errors';
import { prefixIndexPattern } from '../../../../../lib/ccs_utils';

/**
 * Retrieve pipelines for a node
 */
export function logstashNodePipelinesRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash/node/{logstashUuid}/pipelines',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required(),
          logstashUuid: Joi.string().required()
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
    handler: async (req, reply) => {
      const config = server.config();
      const { ccs } = req.payload;
      const { clusterUuid, logstashUuid } = req.params;
      const lsIndexPattern = prefixIndexPattern(config, 'xpack.monitoring.logstash.index_pattern', ccs);
      const throughputMetric = 'logstash_node_pipeline_throughput';
      const nodesCountMetric = 'logstash_node_pipeline_nodes_count';
      const metricSet = [
        throughputMetric,
        nodesCountMetric
      ];

      try {
        const response = await processPipelinesAPIResponse(
          {
            pipelines: await getPipelines(req, lsIndexPattern, metricSet),
            nodeSummary: await getNodeInfo(req, lsIndexPattern, { clusterUuid, logstashUuid })
          },
          throughputMetric,
          nodesCountMetric
        );
        reply(response);
      } catch (err) {
        reply(handleError(err, req));
      }
    }
  });
}
