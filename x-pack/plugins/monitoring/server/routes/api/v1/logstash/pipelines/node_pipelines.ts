/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNodeInfo } from '../../../../../lib/logstash/get_node_info';
import { handleError } from '../../../../../lib/errors';
import { getPaginatedPipelines } from '../../../../../lib/logstash/get_paginated_pipelines';
import { MonitoringCore, PipelineMetricKey } from '../../../../../types';
import { createValidationFunction } from '../../../../../lib/create_route_validation_function';
import {
  postLogstashNodePipelinesRequestParamsRT,
  postLogstashNodePipelinesRequestPayloadRT,
} from '../../../../../../common/http_api/logstash';

const throughputMetric = 'logstash_node_pipeline_throughput';
const nodesCountMetric = 'logstash_node_pipeline_nodes_count';

// Mapping client and server metric keys together
const sortMetricSetMap = {
  latestThroughput: throughputMetric,
  latestNodesCount: nodesCountMetric,
};

export function logstashNodePipelinesRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postLogstashNodePipelinesRequestParamsRT);
  const validateBody = createValidationFunction(postLogstashNodePipelinesRequestPayloadRT);
  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash/node/{logstashUuid}/pipelines',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    async handler(req) {
      const {
        pagination,
        sort: { field = '', direction = 'desc' } = {},
        queryText = '',
      } = req.payload;
      const { clusterUuid, logstashUuid } = req.params;

      try {
        const response = await getPaginatedPipelines({
          req,
          clusterUuid,
          logstashUuid,
          metrics: { throughputMetric, nodesCountMetric },
          pagination,
          sort: {
            field: (sortMetricSetMap[field as keyof typeof sortMetricSetMap] ??
              field) as PipelineMetricKey,
            direction,
          },
          queryText,
        });

        return {
          ...response,
          nodeSummary: await getNodeInfo(req, { clusterUuid, logstashUuid }),
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
