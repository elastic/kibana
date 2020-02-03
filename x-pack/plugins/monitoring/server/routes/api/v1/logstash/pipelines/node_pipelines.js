/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { getNodeInfo } from '../../../../../lib/logstash/get_node_info';
import {
  getPipelines,
  processPipelinesAPIResponse,
} from '../../../../../lib/logstash/get_pipelines';
import { handleError } from '../../../../../lib/errors';
import { prefixIndexPattern } from '../../../../../lib/ccs_utils';
import { INDEX_PATTERN_LOGSTASH } from '../../../../../../common/constants';
import { getPaginatedPipelines } from '../../../../../lib/logstash/get_paginated_pipelines';

/**
 * Retrieve pipelines for a node
 */
export function logstashNodePipelinesRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash/node/{logstashUuid}/pipelines',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
          logstashUuid: schema.string(),
        }),
        payload: schema.object({
          ccs: schema.maybe(schema.string()),
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
          pagination: schema.object({
            index: schema.number(),
            size: schema.number(),
          }),
          sort: schema.maybe(
            schema.object({
              field: schema.string(),
              direction: schema.string(),
            })
          ),
          queryText: schema.string({ defaultValue: '' }),
        }),
      },
    },
    handler: async req => {
      const config = server.config();
      const { ccs, pagination, sort, queryText } = req.payload;
      const { clusterUuid, logstashUuid } = req.params;
      const lsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_LOGSTASH, ccs);

      const throughputMetric = 'logstash_node_pipeline_throughput';
      const nodesCountMetric = 'logstash_node_pipeline_nodes_count';
      const metricSet = [throughputMetric, nodesCountMetric];

      // The client side fields do not match the server side metric names
      // so adjust that here. See processPipelinesAPIResponse
      const sortMetricSetMap = {
        latestThroughput: throughputMetric,
        latestNodesCount: nodesCountMetric,
      };
      if (sort) {
        sort.field = sortMetricSetMap[sort.field] || sort.field;
      }

      const { pageOfPipelines, totalPipelineCount } = await getPaginatedPipelines(
        req,
        lsIndexPattern,
        { clusterUuid, logstashUuid },
        metricSet,
        pagination,
        sort,
        queryText
      );
      try {
        const pipelineData = await getPipelines(req, lsIndexPattern, pageOfPipelines, metricSet);
        const response = await processPipelinesAPIResponse(
          {
            pipelines: pipelineData,
            nodeSummary: await getNodeInfo(req, lsIndexPattern, { clusterUuid, logstashUuid }),
          },
          throughputMetric,
          nodesCountMetric
        );
        return {
          ...response,
          totalPipelineCount,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
