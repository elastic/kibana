/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr } from 'lodash/fp';

import {
  FlowDirection,
  FlowTarget,
  NetworkDnsEdges,
  NetworkTopNFlowData,
  NetworkTopNFlowEdges,
} from '../../graphql/types';
import { DatabaseSearchResponse, FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';

import { NetworkDnsRequestOptions, NetworkTopNFlowRequestOptions } from './index';
import { buildDnsQuery } from './query_dns.dsl';
import { buildTopNFlowQuery } from './query_top_n_flow.dsl';
import { NetworkAdapter, NetworkDnsBuckets, NetworkTopNFlowBuckets } from './types';

export class ElasticsearchNetworkAdapter implements NetworkAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getNetworkTopNFlow(
    request: FrameworkRequest,
    options: NetworkTopNFlowRequestOptions
  ): Promise<NetworkTopNFlowData> {
    const response = await this.framework.callWithRequest<NetworkTopNFlowData, TermAggregation>(
      request,
      'search',
      buildTopNFlowQuery(options)
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

  public async getNetworkDns(
    request: FrameworkRequest,
    options: NetworkDnsRequestOptions
  ): Promise<NetworkTopNFlowData> {
    const response = await this.framework.callWithRequest<NetworkTopNFlowData, TermAggregation>(
      request,
      'search',
      buildDnsQuery(options)
    );
    const { cursor, limit } = options.pagination;
    const totalCount = getOr(0, 'aggregations.dns_count.value', response);
    const networkDnsEdges: NetworkDnsEdges[] = formatDnsEdges(
      getOr([], 'aggregations.dns_name_query_count.buckets', response)
    );
    const hasNextPage = networkDnsEdges.length > limit;
    const beginning = cursor != null ? parseInt(cursor, 10) : 0;
    const edges = networkDnsEdges.splice(beginning, limit - beginning);

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
  if (options.flowDirection === FlowDirection.uniDirectional) {
    return formatTopNFlowEdges(
      getOr([], 'aggregations.top_uni_flow.buckets', response),
      options.flowTarget
    );
  }
  return formatTopNFlowEdges(
    getOr([], 'aggregations.top_bi_flow.buckets', response),
    options.flowTarget
  );
};

const formatTopNFlowEdges = (
  buckets: NetworkTopNFlowBuckets[],
  flowTarget: FlowTarget
): NetworkTopNFlowEdges[] =>
  buckets.map((bucket: NetworkTopNFlowBuckets) => ({
    node: {
      _id: bucket.key,
      timestamp: bucket.timestamp.value_as_string,
      [flowTarget]: {
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

const formatDnsEdges = (buckets: NetworkDnsBuckets[]): NetworkDnsEdges[] =>
  buckets.map((bucket: NetworkDnsBuckets) => ({
    node: {
      _id: bucket.key,
      timestamp: bucket.timestamp.value_as_string,
      dnsBytesIn: getOrNumber('dns_bytes_in.value', bucket),
      dnsBytesOut: getOrNumber('dns_bytes_out.value', bucket),
      dnsName: bucket.key,
      queryCount: bucket.doc_count,
      uniqueDomains: getOrNumber('unique_domains.value', bucket),
    },
    cursor: {
      value: bucket.key,
      tiebreaker: null,
    },
  }));

const getOrNumber = (path: string, bucket: NetworkTopNFlowBuckets | NetworkDnsBuckets) => {
  const numb = get(path, bucket);
  if (numb == null) {
    return null;
  }
  return numb;
};
