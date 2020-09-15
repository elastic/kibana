/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { InfraDatabaseSearchResponse, CallWithRequestParams } from '../adapters/framework';

import { JsonObject } from '../../../common/typed_json';
import { SNAPSHOT_COMPOSITE_REQUEST_SIZE } from './constants';
import {
  getGroupedNodesSources,
  getMetricsAggregations,
  getMetricsSources,
  getDateHistogramOffset,
} from './query_helpers';
import {
  getNodeMetrics,
  getNodeMetricsForLookup,
  getNodePath,
  InfraSnapshotNodeGroupByBucket,
  InfraSnapshotNodeMetricsBucket,
} from './response_helpers';
import { getAllCompositeData } from '../../utils/get_all_composite_data';
import { createAfterKeyHandler } from '../../utils/create_afterkey_handler';
import { findInventoryModel } from '../../../common/inventory_models';
import { InfraSnapshotRequestOptions } from './types';
import { createTimeRangeWithInterval } from './create_timerange_with_interval';
import { SnapshotNode } from '../../../common/http_api/snapshot_api';

type NamedSnapshotNode = SnapshotNode & { name: string };

export type ESSearchClient = <Hit = {}, Aggregation = undefined>(
  options: CallWithRequestParams
) => Promise<InfraDatabaseSearchResponse<Hit, Aggregation>>;
export class InfraSnapshot {
  public async getNodes(
    client: ESSearchClient,
    options: InfraSnapshotRequestOptions
  ): Promise<{ nodes: NamedSnapshotNode[]; interval: string }> {
    // Both requestGroupedNodes and requestNodeMetrics may send several requests to elasticsearch
    // in order to page through the results of their respective composite aggregations.
    // Both chains of requests are supposed to run in parallel, and their results be merged
    // when they have both been completed.
    const timeRangeWithIntervalApplied = await createTimeRangeWithInterval(client, options);
    const optionsWithTimerange = { ...options, timerange: timeRangeWithIntervalApplied };

    const groupedNodesPromise = requestGroupedNodes(client, optionsWithTimerange);
    const nodeMetricsPromise = requestNodeMetrics(client, optionsWithTimerange);
    const [groupedNodeBuckets, nodeMetricBuckets] = await Promise.all([
      groupedNodesPromise,
      nodeMetricsPromise,
    ]);
    return {
      nodes: mergeNodeBuckets(groupedNodeBuckets, nodeMetricBuckets, options),
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

const requestGroupedNodes = async (
  client: ESSearchClient,
  options: InfraSnapshotRequestOptions
): Promise<InfraSnapshotNodeGroupByBucket[]> => {
  const inventoryModel = findInventoryModel(options.nodeType);
  const query = {
    allowNoIndices: true,
    index: `${options.sourceConfiguration.logAlias},${options.sourceConfiguration.metricAlias}`,
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
                sort: [{ [options.sourceConfiguration.fields.timestamp]: { order: 'desc' } }],
                _source: {
                  includes: inventoryModel.fields.ip ? [inventoryModel.fields.ip] : [],
                },
                size: 1,
              },
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

const calculateIndexPatterBasedOnMetrics = (options: InfraSnapshotRequestOptions) => {
  const { metrics } = options;
  if (metrics.every((m) => m.type === 'logRate')) {
    return options.sourceConfiguration.logAlias;
  }
  if (metrics.some((m) => m.type === 'logRate')) {
    return `${options.sourceConfiguration.logAlias},${options.sourceConfiguration.metricAlias}`;
  }
  return options.sourceConfiguration.metricAlias;
};

const requestNodeMetrics = async (
  client: ESSearchClient,
  options: InfraSnapshotRequestOptions
): Promise<InfraSnapshotNodeMetricsBucket[]> => {
  const index = calculateIndexPatterBasedOnMetrics(options);
  const query = {
    allowNoIndices: true,
    index,
    ignoreUnavailable: true,
    body: {
      query: {
        bool: {
          filter: buildFilters(options, false),
        },
      },
      size: 0,
      aggregations: {
        nodes: {
          composite: {
            size: options.overrideCompositeSize || SNAPSHOT_COMPOSITE_REQUEST_SIZE,
            sources: getMetricsSources(options),
          },
          aggregations: {
            histogram: {
              date_histogram: {
                field: options.sourceConfiguration.fields.timestamp,
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
  return getAllCompositeData<InfraSnapshotAggregationResponse, InfraSnapshotNodeMetricsBucket>(
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

const mergeNodeBuckets = (
  nodeGroupByBuckets: InfraSnapshotNodeGroupByBucket[],
  nodeMetricsBuckets: InfraSnapshotNodeMetricsBucket[],
  options: InfraSnapshotRequestOptions
): NamedSnapshotNode[] => {
  const nodeMetricsForLookup = getNodeMetricsForLookup(nodeMetricsBuckets);

  return nodeGroupByBuckets.map((node) => {
    return {
      name: node.key.name || node.key.id, // For type safety; name can be derived from getNodePath but not in a TS-friendly way
      path: getNodePath(node, options),
      metrics: getNodeMetrics(nodeMetricsForLookup[node.key.id], options),
    };
  });
};

const createQueryFilterClauses = (filterQuery: JsonObject | undefined) =>
  filterQuery ? [filterQuery] : [];

const buildFilters = (options: InfraSnapshotRequestOptions, withQuery = true) => {
  let filters: any = [
    {
      range: {
        [options.sourceConfiguration.fields.timestamp]: {
          gte: options.timerange.from,
          lte: options.timerange.to,
          format: 'epoch_millis',
        },
      },
    },
  ];

  if (withQuery) {
    filters = [...createQueryFilterClauses(options.filterQuery), ...filters];
  }

  if (options.accountId) {
    filters.push({
      term: {
        'cloud.account.id': options.accountId,
      },
    });
  }

  if (options.region) {
    filters.push({
      term: {
        'cloud.region': options.region,
      },
    });
  }

  return filters;
};
