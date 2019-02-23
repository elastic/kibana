/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr } from 'lodash/fp';

import {
  NetworkTopNFlowData,
  NetworkTopNFlowDirection,
  NetworkTopNFlowEdges,
  NetworkTopNFlowType,
} from '../../graphql/types';
import { DatabaseSearchResponse, FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';
import { NetworkTopNFlowRequestOptions } from './index';
import { buildQuery } from './query.dsl';
import { NetworkTopNFlowAdapter, NetworkTopNFlowBuckets } from './types';

export class ElasticsearchNetworkTopNFlowAdapter implements NetworkTopNFlowAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getNetworkTopNFlow(
    request: FrameworkRequest,
    options: NetworkTopNFlowRequestOptions
  ): Promise<NetworkTopNFlowData> {
    const response = await this.framework.callWithRequest<NetworkTopNFlowData, TermAggregation>(
      request,
      'search',
      buildQuery(options)
    );
    const { cursor, limit } = options.pagination;
    const totalCount = getOr(0, 'aggregations.top_n_flow_count.value', response);
    const networkTopNFlowEdges: NetworkTopNFlowEdges[] = getTopNFlowEdges(response, options);
    const hasNextPage = networkTopNFlowEdges.length > limit;
    const beginning = cursor != null ? parseInt(cursor, 10) : 0;
    const edges = networkTopNFlowEdges.splice(beginning, limit - beginning);

    return {
      edges,
      totalCount,
      pageInfo: {
        hasNextPage,
        endCursor: {
          value: String(limit),
          tiebreaker: null,
        },
      },
    };
  }
}

const getTopNFlowEdges = (
  response: DatabaseSearchResponse<NetworkTopNFlowData, TermAggregation>,
  options: NetworkTopNFlowRequestOptions
): NetworkTopNFlowEdges[] => {
  if (options.networkTopNFlowDirection === NetworkTopNFlowDirection.uniDirectional) {
    return formatTopNFlowEgdes(
      getOr([], 'aggregations.top_uni_flow.buckets', response),
      options.networkTopNFlowType
    );
  }
  return formatTopNFlowEgdes(
    getOr([], 'aggregations.top_bi_flow.buckets', response),
    options.networkTopNFlowType
  );
};

const formatTopNFlowEgdes = (
  buckets: NetworkTopNFlowBuckets[],
  networkTopNFlowType: NetworkTopNFlowType
): NetworkTopNFlowEdges[] =>
  buckets.map((bucket: NetworkTopNFlowBuckets) => ({
    node: {
      _id: bucket.key,
      timestamp: bucket.timestamp.value_as_string,
      [networkTopNFlowType]: {
        count: getOrNumber('ip_count.value', bucket),
        domain: bucket.domain.buckets.map(bucketDomain => bucketDomain.key),
        ip: bucket.key,
      },
      network: {
        bytes: getOrNumber('bytes.value', bucket),
        packets: getOrNumber('packets.value', bucket),
        direction: bucket.direction.buckets.map(bucketDir => bucketDir.key),
      },
    },
    cursor: {
      value: bucket.key,
      tiebreaker: null,
    },
  }));

const getOrNumber = (path: string, bucket: NetworkTopNFlowBuckets) => {
  const numb = get(path, bucket);
  if (numb == null) {
    return null;
  }
  return numb;
};
