/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { InfraDatabaseSearchResponse, CallWithRequestParams } from '../adapters/framework';

import { SNAPSHOT_COMPOSITE_REQUEST_SIZE } from './constants';
import {
  getGroupedNodesSources,
  getMetricsAggregations,
  getDateHistogramOffset,
} from './query_helpers';
import { getNodeMetrics, getNodePath, InfraSnapshotNodeGroupByBucket } from './response_helpers';
import { getAllCompositeData } from '../../utils/get_all_composite_data';
import { createAfterKeyHandler } from '../../utils/create_afterkey_handler';
import { findInventoryModel } from '../../../common/inventory_models';
import { InfraSnapshotRequestOptions } from './types';
import { createTimeRangeWithInterval } from './create_timerange_with_interval';
import { SnapshotNode } from '../../../common/http_api/snapshot_api';
import { copyMissingMetrics } from './copy_missing_metrics';

export type ESSearchClient = <Hit = {}, Aggregation = undefined>(
  options: CallWithRequestParams
) => Promise<InfraDatabaseSearchResponse<Hit, Aggregation>>;

export class InfraSnapshot {
  public async getNodes(
    client: ESSearchClient,
    options: InfraSnapshotRequestOptions
  ): Promise<{ nodes: SnapshotNode[]; interval: string }> {
    // Both requestGroupedNodes and requestNodeMetrics may send several requests to elasticsearch
    // in order to page through the results of their respective composite aggregations.
    // Both chains of requests are supposed to run in parallel, and their results be merged
    // when they have both been completed.
    const timeRangeWithIntervalApplied = await createTimeRangeWithInterval(client, options);
    const optionsWithTimerange = { ...options, timerange: timeRangeWithIntervalApplied };
    const nodeBuckets = await requestNodes(client, optionsWithTimerange);
    const nodesWithoutMissingMetrics = mapNodeBuckets(nodeBuckets, options);
    const nodes = copyMissingMetrics(nodesWithoutMissingMetrics);
    return {
      nodes,
      interval: timeRangeWithIntervalApplied.interval,
    };
  }
}

const bucketSelector = (
  response: InfraDatabaseSearchResponse<{}, InfraSnapshotAggregationResponse>
) => (response.aggregations && response.aggregations.nodes.buckets) || [];

const handleAfterKey = createAfterKeyHandler(
  'body.aggregations.nodes.composite.after',
  (input) => input?.aggregations?.nodes?.after_key
);

const callClusterFactory = (search: ESSearchClient) => (opts: any) =>
  search<{}, InfraSnapshotAggregationResponse>(opts);

const requestNodes = async (
  client: ESSearchClient,
  options: InfraSnapshotRequestOptions
): Promise<InfraSnapshotNodeGroupByBucket[]> => {
  const inventoryModel = findInventoryModel(options.nodeType);
  const index = options.indexPattern;
  const query = {
    allowNoIndices: true,
    index,
    ignoreUnavailable: true,
    body: {
      query: {
        bool: {
          filter: buildFilters(options),
        },
      },
      size: 0,
      aggregations: {
        nodes: {
          composite: {
            size: options.overrideCompositeSize || SNAPSHOT_COMPOSITE_REQUEST_SIZE,
            sources: getGroupedNodesSources(options),
          },
          aggs: {
            ip: {
              top_hits: {
                sort: [{ [options.timerange.field]: { order: 'desc' } }],
                _source: {
                  includes: inventoryModel.fields.ip ? [inventoryModel.fields.ip] : [],
                },
                size: 1,
              },
            },
            histogram: {
              date_histogram: {
                field: options.timerange.field,
                interval: options.timerange.interval || '1m',
                offset: getDateHistogramOffset(options.timerange.from, options.timerange.interval),
                extended_bounds: {
                  min: options.timerange.from,
                  max: options.timerange.to,
                },
              },
              aggregations: getMetricsAggregations(options),
            },
          },
        },
      },
    },
  };
  return getAllCompositeData<InfraSnapshotAggregationResponse, InfraSnapshotNodeGroupByBucket>(
    callClusterFactory(client),
    query,
    bucketSelector,
    handleAfterKey
  );
};

// buckets can be InfraSnapshotNodeGroupByBucket[] or InfraSnapshotNodeMetricsBucket[]
// but typing this in a way that makes TypeScript happy is unreadable (if possible at all)
interface InfraSnapshotAggregationResponse {
  nodes: {
    buckets: any[];
    after_key: { [id: string]: string };
  };
}

const mapNodeBuckets = (
  nodeGroupByBuckets: InfraSnapshotNodeGroupByBucket[],
  options: InfraSnapshotRequestOptions
): SnapshotNode[] => {
  return nodeGroupByBuckets.map((node) => {
    return {
      path: getNodePath(node, options),
      metrics: getNodeMetrics(node, options),
    };
  });
};

const buildFilters = (options: InfraSnapshotRequestOptions) => {
  const filters: object[] = [
    {
      range: {
        [options.timerange.field]: {
          gte: options.timerange.from,
          lte: options.timerange.to,
          format: 'epoch_millis',
        },
      },
    },
    ...(options.filters || []),
  ];

  return filters;
};
