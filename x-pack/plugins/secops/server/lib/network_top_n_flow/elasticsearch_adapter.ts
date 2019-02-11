/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import {
  NetworkTopNFlowData,
  NetworkTopNFlowEdges,
  NetworkTopNFlowType,
} from '../../graphql/types';
import { FrameworkAdapter, FrameworkRequest } from '../framework';
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
    const totalCount = getOr(0, 'aggregations.network_top_n_flow_count.value', response);
    const buckets = getOr([], 'aggregations.network_top_n_flow.buckets', response);
    const networkTopNFlowItemAttr =
      options.networkTopNFlowType === NetworkTopNFlowType.source ? 'source' : 'destination';
    const networkTopNFlowEdges: NetworkTopNFlowEdges[] = buckets.map(
      (bucket: NetworkTopNFlowBuckets) => ({
        node:
          bucket.domain.buckets.length > 0
            ? {
                _id: bucket.key,
                [networkTopNFlowItemAttr]: {
                  domain:
                    bucket.domain.buckets[0].key === '__missing__'
                      ? ''
                      : bucket.domain.buckets[0].key,
                  ip: bucket.key,
                },
                event: { duration: bucket.domain.buckets[0].event_duration.value },
                network: {
                  bytes: bucket.domain.buckets[0].network_bytes.value,
                  packets: bucket.domain.buckets[0].network_packets.value,
                },
              }
            : {},
        cursor: {
          value: bucket.key,
          tiebreaker: null,
        },
      })
    );
    const hasNextPage = networkTopNFlowEdges.length === limit + 1;
    const beginning = cursor != null ? parseInt(cursor!, 10) : 0;
    const edges = networkTopNFlowEdges.splice(beginning, limit);
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
