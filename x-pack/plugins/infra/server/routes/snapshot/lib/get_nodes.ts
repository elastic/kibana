/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SnapshotRequest } from '../../../../common/http_api';
import { ESSearchClient } from '../../../lib/metrics/types';
import { InfraSource } from '../../../lib/sources';
import { transformRequestToMetricsAPIRequest } from './transform_request_to_metrics_api_request';
import { queryAllData } from './query_all_data';
import { transformMetricsApiResponseToSnapshotResponse } from './trasform_metrics_ui_response';
import { copyMissingMetrics } from './copy_missing_metrics';
import { LogQueryFields } from '../../../services/log_queries/get_log_query_fields';

export interface SourceOverrides {
  indexPattern: string;
  timestamp: string;
}

const transformAndQueryData = async (
  client: ESSearchClient,
  snapshotRequest: SnapshotRequest,
  source: InfraSource,
  sourceOverrides?: SourceOverrides
) => {
  const metricsApiRequest = await transformRequestToMetricsAPIRequest(
    client,
    source,
    snapshotRequest,
    sourceOverrides
  );
  const metricsApiResponse = await queryAllData(client, metricsApiRequest);
  const snapshotResponse = transformMetricsApiResponseToSnapshotResponse(
    metricsApiRequest,
    snapshotRequest,
    source,
    metricsApiResponse
  );
  return copyMissingMetrics(snapshotResponse);
};

export const getNodes = async (
  client: ESSearchClient,
  snapshotRequest: SnapshotRequest,
  source: InfraSource,
  logQueryFields: LogQueryFields
) => {
  let nodes;

  if (snapshotRequest.metrics.find((metric) => metric.type === 'logRate')) {
    // *Only* the log rate metric has been requested
    if (snapshotRequest.metrics.length === 1) {
      nodes = await transformAndQueryData(client, snapshotRequest, source, logQueryFields);
    } else {
      // A scenario whereby a single host might be shipping metrics and logs.
      const metricsWithoutLogsMetrics = snapshotRequest.metrics.filter(
        (metric) => metric.type !== 'logRate'
      );
      const nodesWithoutLogsMetrics = await transformAndQueryData(
        client,
        { ...snapshotRequest, metrics: metricsWithoutLogsMetrics },
        source
      );
      const logRateNodes = await transformAndQueryData(
        client,
        { ...snapshotRequest, metrics: [{ type: 'logRate' }] },
        source,
        logQueryFields
      );
      // Merge nodes where possible - e.g. a single host is shipping metrics and logs
      const mergedNodes = nodesWithoutLogsMetrics.nodes.map((node) => {
        const logRateNode = logRateNodes.nodes.find(
          (_logRateNode) => node.name === _logRateNode.name
        );
        if (logRateNode) {
          // Remove this from the "leftovers"
          logRateNodes.nodes.filter((_node) => _node.name !== logRateNode.name);
        }
        return logRateNode
          ? {
              ...node,
              metrics: [...node.metrics, ...logRateNode.metrics],
            }
          : node;
      });
      nodes = {
        ...nodesWithoutLogsMetrics,
        nodes: [...mergedNodes, ...logRateNodes.nodes],
      };
    }
  } else {
    nodes = await transformAndQueryData(client, snapshotRequest, source);
  }

  return nodes;
};
