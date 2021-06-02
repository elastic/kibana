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
import { queryAllData, queryAllSnapshotData } from './query_all_data';
import { transformMetricsApiResponseToSnapshotResponse } from './trasform_metrics_ui_response';
import { copyMissingMetrics } from './copy_missing_metrics';
import { LogQueryFields } from '../../../services/log_queries/get_log_query_fields';
import { transformSnapshotRequestToESQuery } from './transform_snapshot_request_to_es_query';
import { convertSnapshotBucketsToSnapshotResponse } from './convert_snapshot_buckets_to_snapshot_response';

export interface SourceOverrides {
  indexPattern: string;
  timestamp: string;
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
  if (snapshotRequest.combinedComposite) {
    // console.log('---- Composite with Terms & Date Histogram ----');
    // console.time('total');
    // console.time('transformSnapshotRequestToESQuery');
    const esQuery = await transformSnapshotRequestToESQuery({
      client,
      source,
      snapshotRequest,
      compositeSize,
      sourceOverrides,
    });
    // console.timeEnd('transformSnapshotRequestToESQuery');
    // console.time('queryAllSnapshotData');
    const snapshotBuckets = await queryAllSnapshotData(client, esQuery);
    // console.timeEnd('queryAllSnapshotData');
    // console.time('convertSnapshotBucketsToSnapshotResponse');
    const combinedSnapshotResponse = convertSnapshotBucketsToSnapshotResponse(
      snapshotRequest,
      snapshotBuckets,
      source
    );
    // console.timeEnd('convertSnapshotBucketsToSnapshotResponse');
    // console.log(JSON.stringify(combinedSnapshotResponse, null, 2));
    // console.timeEnd('total');
    console.log('Combined Composite Snapshot', combinedSnapshotResponse.nodes.length);
    return combinedSnapshotResponse;
  } else {
    // console.log('---- Composite with only Terms ----');

    // console.time('total');
    // console.time('transformRequestToMetricsAPIRequest');
    const metricsApiRequest = await transformRequestToMetricsAPIRequest({
      client,
      source,
      snapshotRequest,
      compositeSize,
      sourceOverrides,
    });
    // console.timeEnd('transformRequestToMetricsAPIRequest');
    // console.time('queryAllData');
    const metricsApiResponse = await queryAllData(client, metricsApiRequest);
    // console.timeEnd('queryAllData');
    const snapshotResponse = transformMetricsApiResponseToSnapshotResponse(
      metricsApiRequest,
      snapshotRequest,
      source,
      metricsApiResponse
    );
    // console.time('copyMissingMetrics');
    const results = copyMissingMetrics(snapshotResponse);
    // console.timeEnd('copyMissingMetrics');
    // console.timeEnd('total');
    console.log('Legacy Snapshot', results.nodes.length);
    return results;
  }
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
