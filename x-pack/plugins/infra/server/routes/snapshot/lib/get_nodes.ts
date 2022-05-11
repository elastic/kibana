/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SnapshotRequest } from '../../../../common/http_api';
import { ESSearchClient, LogQueryFields } from '../../../lib/metrics/types';
import { InfraSource } from '../../../lib/sources';
import { transformRequestToMetricsAPIRequest } from './transform_request_to_metrics_api_request';
import { queryAllData } from './query_all_data';
import { transformMetricsApiResponseToSnapshotResponse } from './transform_metrics_ui_response';
import { copyMissingMetrics } from './copy_missing_metrics';

export interface SourceOverrides {
  indexPattern: string;
}

const transformAndQueryData = async ({
  client,
  snapshotRequest,
  source,
  compositeSize,
  sourceOverrides,
}: {
  client: ESSearchClient;
  snapshotRequest: SnapshotRequest;
  source: InfraSource;
  compositeSize: number;
  sourceOverrides?: SourceOverrides;
}) => {
  const metricsApiRequest = await transformRequestToMetricsAPIRequest({
    client,
    source,
    snapshotRequest,
    compositeSize,
    sourceOverrides,
  });
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
  compositeSize: number,
  logQueryFields?: LogQueryFields
) => {
  let nodes;

  if (snapshotRequest.metrics.find((metric) => metric.type === 'logRate')) {
    // *Only* the log rate metric has been requested
    if (snapshotRequest.metrics.length === 1) {
      if (logQueryFields != null) {
        nodes = await transformAndQueryData({
          client,
          snapshotRequest,
          source,
          compositeSize,
          sourceOverrides: logQueryFields,
        });
      } else {
        nodes = { nodes: [], interval: '60s' };
      }
    } else {
      // A scenario whereby a single host might be shipping metrics and logs.
      const metricsWithoutLogsMetrics = snapshotRequest.metrics.filter(
        (metric) => metric.type !== 'logRate'
      );
      const nodesWithoutLogsMetrics = await transformAndQueryData({
        client,
        snapshotRequest: { ...snapshotRequest, metrics: metricsWithoutLogsMetrics },
        source,
        compositeSize,
      });
      const logRateNodes =
        logQueryFields != null
          ? await transformAndQueryData({
              client,
              snapshotRequest: { ...snapshotRequest, metrics: [{ type: 'logRate' }] },
              source,
              compositeSize,
              sourceOverrides: logQueryFields,
            })
          : { nodes: [], interval: '60s' };
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
    nodes = await transformAndQueryData({ client, snapshotRequest, source, compositeSize });
  }

  return nodes;
};
