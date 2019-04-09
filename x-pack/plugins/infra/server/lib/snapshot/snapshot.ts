/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  InfraSnapshotGroupbyInput,
  InfraSnapshotMetricInput,
  InfraSnapshotNode,
  InfraSnapshotTimerangeInput,
  InfraSnapshotType,
  InfraSourceConfiguration,
} from '../../graphql/types';
import { InfraBackendFrameworkAdapter, InfraFrameworkRequest } from '../adapters/framework';
import { InfraSources } from '../sources';

import { JsonObject } from '../../../common/typed_json';
import { SNAPSHOT_COMPOSITE_REQUEST_SIZE } from './constants';
import { getGroupedNodesSources, getMetricsAggregations, getMetricsSources } from './query_helpers';
import { getNodeMetrics, getNodeMetricsForLookup, getNodePath } from './response_helpers';

export interface InfraSnapshotRequestOptions {
  nodeType: InfraSnapshotType;
  sourceConfiguration: InfraSourceConfiguration;
  timerange: InfraSnapshotTimerangeInput;
  groupby: InfraSnapshotGroupbyInput[];
  metric: InfraSnapshotMetricInput;
  filterQuery: JsonObject | undefined;
}

export class InfraSnapshot {
  constructor(
    private readonly libs: { sources: InfraSources; framework: InfraBackendFrameworkAdapter }
  ) {}

  public async getNodes(
    request: InfraFrameworkRequest,
    options: InfraSnapshotRequestOptions
  ): Promise<InfraSnapshotNode[]> {
    // Both requestGroupedNodes and requestNodeMetrics may send several requests to elasticsearch
    // in order to page through the results of their respective composite aggregations.
    // Both chains of requests are supposed to run in parallel, and their results be merged
    // when they have both been completed.
    const groupedNodesPromise = requestGroupedNodes(request, options, this.libs.framework);
    const nodeMetricsPromise = requestNodeMetrics(request, options, this.libs.framework);

    const groupedNodeBuckets = await groupedNodesPromise;
    const nodeMetricBuckets = await nodeMetricsPromise;

    return mergeNodeMetrics(groupedNodeBuckets, nodeMetricBuckets, options);
  }
}

const requestGroupedNodes = async (
  request: InfraFrameworkRequest,
  options: InfraSnapshotRequestOptions,
  framework: InfraBackendFrameworkAdapter
) => {
  // This needs to be typed as 'any' as the query will be altered below to add the 'after_key' field.
  const query: any = {
    allowNoIndices: true,
    index: `${options.sourceConfiguration.logAlias},${options.sourceConfiguration.metricAlias}`,
    ignoreUnavailable: true,
    body: {
      query: {
        bool: {
          filter: [
            ...createQueryFilterClauses(options.filterQuery),
            {
              range: {
                [options.sourceConfiguration.fields.timestamp]: {
                  gte: options.timerange.from,
                  lte: options.timerange.to,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
      size: 0,
      aggs: {
        nodes: {
          composite: {
            size: SNAPSHOT_COMPOSITE_REQUEST_SIZE,
            sources: getGroupedNodesSources(options),
          },
        },
      },
    },
  };

  let response = await framework.callWithRequest<any, any>(request, 'search', query);

  if (response.hits.total.value === 0) {
    return [];
  }

  let buckets = response.aggregations.nodes.buckets;

  // Getting an empty response back is the only way to find out that there are no further results.
  while (response.aggregations.nodes.buckets.length > 0) {
    query.body.aggs.nodes.composite.after = response.aggregations.nodes.after_key;
    response = await framework.callWithRequest<any, any>(request, 'search', query);
    buckets = buckets.concat(response.aggregations.nodes.buckets);
  }
  return buckets;
};

const requestNodeMetrics = async (
  request: InfraFrameworkRequest,
  options: InfraSnapshotRequestOptions,
  framework: InfraBackendFrameworkAdapter
) => {
  const index =
    options.metric.type === 'logRate'
      ? `${options.sourceConfiguration.logAlias}`
      : `${options.sourceConfiguration.metricAlias}`;

  // This needs to be typed as 'any' as the query will be altered below to add the 'after_key' field.
  const query: any = {
    allowNoIndices: true,
    index,
    ignoreUnavailable: true,
    body: {
      query: {
        bool: {
          filter: [
            ...createQueryFilterClauses(options.filterQuery),
            {
              range: {
                [options.sourceConfiguration.fields.timestamp]: {
                  gte: options.timerange.from,
                  lte: options.timerange.to,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
      size: 0,
      aggs: {
        nodes: {
          composite: {
            size: SNAPSHOT_COMPOSITE_REQUEST_SIZE,
            sources: getMetricsSources(options),
          },
          aggregations: {
            histogram: {
              date_histogram: {
                field: options.sourceConfiguration.fields.timestamp,
                interval: options.timerange.interval || '1m',
              },
              aggregations: getMetricsAggregations(options),
            },
          },
        },
      },
    },
  };

  let response = await framework.callWithRequest<any, any>(request, 'search', query);

  if (response.hits.total.value === 0) {
    return [];
  }

  let buckets = response.aggregations.nodes.buckets;

  // Getting an empty response back is the only way to find out that there are no further results.
  while (response.aggregations.nodes.buckets.length > 0) {
    query.body.aggs.nodes.composite.after = response.aggregations.nodes.after_key;
    response = await framework.callWithRequest<any, any>(request, 'search', query);
    buckets = buckets.concat(response.aggregations.nodes.buckets);
  }
  return buckets;
};

const mergeNodeMetrics = (
  nodes: any[],
  metrics: any[],
  options: InfraSnapshotRequestOptions
): InfraSnapshotNode[] => {
  const result: any[] = [];
  const nodeMetricsForLookup = getNodeMetricsForLookup(metrics);

  nodes.forEach(node => {
    const returnNode = {
      path: getNodePath(node, options),
      metric: getNodeMetrics(nodeMetricsForLookup[node.key.node], options),
    };
    result.push(returnNode);
  });

  return result;
};

const createQueryFilterClauses = (filterQuery: JsonObject | undefined) =>
  filterQuery ? [filterQuery] : [];
