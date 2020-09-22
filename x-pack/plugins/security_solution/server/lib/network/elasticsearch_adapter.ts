/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr } from 'lodash/fp';

import {
  FlowTargetSourceDest,
  AutonomousSystemItem,
  GeoItem,
  NetworkDnsData,
  NetworkDnsEdges,
  NetworkTopCountriesData,
  NetworkTopCountriesEdges,
  NetworkTopNFlowData,
  NetworkHttpData,
  NetworkHttpEdges,
  NetworkTopNFlowEdges,
} from '../../graphql/types';
import { inspectStringifyObject } from '../../utils/build_query';
import { DatabaseSearchResponse, FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../common/constants';

import {
  NetworkDnsRequestOptions,
  NetworkTopCountriesRequestOptions,
  NetworkHttpRequestOptions,
  NetworkTopNFlowRequestOptions,
} from './index';
import { buildDnsQuery } from './query_dns.dsl';
import { buildTopNFlowQuery, getOppositeField } from './query_top_n_flow.dsl';
import { buildHttpQuery } from './query_http.dsl';
import { buildTopCountriesQuery } from './query_top_countries.dsl';
import {
  NetworkAdapter,
  NetworkDnsBuckets,
  NetworkTopCountriesBuckets,
  NetworkHttpBuckets,
  NetworkTopNFlowBuckets,
} from './types';

export class ElasticsearchNetworkAdapter implements NetworkAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getNetworkTopCountries(
    request: FrameworkRequest,
    options: NetworkTopCountriesRequestOptions
  ): Promise<NetworkTopCountriesData> {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    const dsl = buildTopCountriesQuery(options);
    const response = await this.framework.callWithRequest<NetworkTopCountriesData, TermAggregation>(
      request,
      'search',
      dsl
    );
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.top_countries_count.value', response);
    const networkTopCountriesEdges: NetworkTopCountriesEdges[] = getTopCountriesEdges(
      response,
      options
    );
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = networkTopCountriesEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    const showMorePagesIndicator = totalCount > fakeTotalCount;

    return {
      edges,
      inspect,
      pageInfo: {
        activePage: activePage ? activePage : 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
      totalCount,
    };
  }

  public async getNetworkTopNFlow(
    request: FrameworkRequest,
    options: NetworkTopNFlowRequestOptions
  ): Promise<NetworkTopNFlowData> {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    const dsl = buildTopNFlowQuery(options);
    const response = await this.framework.callWithRequest<NetworkTopNFlowData, TermAggregation>(
      request,
      'search',
      dsl
    );
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.top_n_flow_count.value', response);
    const networkTopNFlowEdges: NetworkTopNFlowEdges[] = getTopNFlowEdges(response, options);
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = networkTopNFlowEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    const showMorePagesIndicator = totalCount > fakeTotalCount;

    return {
      edges,
      inspect,
      pageInfo: {
        activePage: activePage ? activePage : 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
      totalCount,
    };
  }

  public async getNetworkDns(
    request: FrameworkRequest,
    options: NetworkDnsRequestOptions
  ): Promise<NetworkDnsData> {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    const dsl = buildDnsQuery(options);
    const response = await this.framework.callWithRequest<NetworkDnsData, TermAggregation>(
      request,
      'search',
      dsl
    );
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.dns_count.value', response);
    const networkDnsEdges: NetworkDnsEdges[] = formatDnsEdges(
      getOr([], 'aggregations.dns_name_query_count.buckets', response)
    );
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = networkDnsEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    const showMorePagesIndicator = totalCount > fakeTotalCount;
    return {
      edges,
      inspect,
      pageInfo: {
        activePage: activePage ? activePage : 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
      totalCount,
    };
  }

  public async getNetworkHttp(
    request: FrameworkRequest,
    options: NetworkHttpRequestOptions
  ): Promise<NetworkHttpData> {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    const dsl = buildHttpQuery(options);
    const response = await this.framework.callWithRequest<NetworkHttpData, TermAggregation>(
      request,
      'search',
      dsl
    );
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.http_count.value', response);
    const networkHttpEdges: NetworkHttpEdges[] = getHttpEdges(response);
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = networkHttpEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    const showMorePagesIndicator = totalCount > fakeTotalCount;

    return {
      edges,
      inspect,
      pageInfo: {
        activePage: activePage ? activePage : 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
      totalCount,
    };
  }
}

const getTopNFlowEdges = (
  response: DatabaseSearchResponse<NetworkTopNFlowData, TermAggregation>,
  options: NetworkTopNFlowRequestOptions
): NetworkTopNFlowEdges[] => {
  return formatTopNFlowEdges(
    getOr([], `aggregations.${options.flowTarget}.buckets`, response),
    options.flowTarget
  );
};

const getTopCountriesEdges = (
  response: DatabaseSearchResponse<NetworkTopCountriesData, TermAggregation>,
  options: NetworkTopCountriesRequestOptions
): NetworkTopCountriesEdges[] => {
  return formatTopCountriesEdges(
    getOr([], `aggregations.${options.flowTarget}.buckets`, response),
    options.flowTarget
  );
};

const getHttpEdges = (
  response: DatabaseSearchResponse<NetworkHttpData, TermAggregation>
): NetworkHttpEdges[] => {
  return formatHttpEdges(getOr([], `aggregations.url.buckets`, response));
};

const getFlowTargetFromString = (flowAsString: string) =>
  flowAsString === 'source' ? FlowTargetSourceDest.source : FlowTargetSourceDest.destination;

const getGeoItem = (result: NetworkTopNFlowBuckets): GeoItem | null =>
  result.location.top_geo.hits.hits.length > 0 && result.location.top_geo.hits.hits[0]._source
    ? {
        geo: getOr(
          '',
          `location.top_geo.hits.hits[0]._source.${
            Object.keys(result.location.top_geo.hits.hits[0]._source)[0]
          }.geo`,
          result
        ),
        flowTarget: getFlowTargetFromString(
          Object.keys(result.location.top_geo.hits.hits[0]._source)[0]
        ),
      }
    : null;

const getAsItem = (result: NetworkTopNFlowBuckets): AutonomousSystemItem | null =>
  result.autonomous_system.top_as.hits.hits.length > 0 &&
  result.autonomous_system.top_as.hits.hits[0]._source
    ? {
        number: getOr(
          null,
          `autonomous_system.top_as.hits.hits[0]._source.${
            Object.keys(result.autonomous_system.top_as.hits.hits[0]._source)[0]
          }.as.number`,
          result
        ),
        name: getOr(
          '',
          `autonomous_system.top_as.hits.hits[0]._source.${
            Object.keys(result.autonomous_system.top_as.hits.hits[0]._source)[0]
          }.as.organization.name`,
          result
        ),
      }
    : null;

const formatTopNFlowEdges = (
  buckets: NetworkTopNFlowBuckets[],
  flowTarget: FlowTargetSourceDest
): NetworkTopNFlowEdges[] =>
  buckets.map((bucket: NetworkTopNFlowBuckets) => ({
    node: {
      _id: bucket.key,
      [flowTarget]: {
        domain: bucket.domain.buckets.map((bucketDomain) => bucketDomain.key),
        ip: bucket.key,
        location: getGeoItem(bucket),
        autonomous_system: getAsItem(bucket),
        flows: getOr(0, 'flows.value', bucket),
        [`${getOppositeField(flowTarget)}_ips`]: getOr(
          0,
          `${getOppositeField(flowTarget)}_ips.value`,
          bucket
        ),
      },
      network: {
        bytes_in: getOr(0, 'bytes_in.value', bucket),
        bytes_out: getOr(0, 'bytes_out.value', bucket),
      },
    },
    cursor: {
      value: bucket.key,
      tiebreaker: null,
    },
  }));

const formatTopCountriesEdges = (
  buckets: NetworkTopCountriesBuckets[],
  flowTarget: FlowTargetSourceDest
): NetworkTopCountriesEdges[] =>
  buckets.map((bucket: NetworkTopCountriesBuckets) => ({
    node: {
      _id: bucket.key,
      [flowTarget]: {
        country: bucket.key,
        flows: getOr(0, 'flows.value', bucket),
        [`${getOppositeField(flowTarget)}_ips`]: getOr(
          0,
          `${getOppositeField(flowTarget)}_ips.value`,
          bucket
        ),
        [`${flowTarget}_ips`]: getOr(0, `${flowTarget}_ips.value`, bucket),
      },
      network: {
        bytes_in: getOr(0, 'bytes_in.value', bucket),
        bytes_out: getOr(0, 'bytes_out.value', bucket),
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

const formatHttpEdges = (buckets: NetworkHttpBuckets[]): NetworkHttpEdges[] =>
  buckets.map((bucket: NetworkHttpBuckets) => ({
    node: {
      _id: bucket.key,
      domains: bucket.domains.buckets.map(({ key }) => key),
      methods: bucket.methods.buckets.map(({ key }) => key),
      statuses: bucket.status.buckets.map(({ key }) => `${key}`),
      lastHost: get('source.hits.hits[0]._source.host.name', bucket),
      lastSourceIp: get('source.hits.hits[0]._source.source.ip', bucket),
      path: bucket.key,
      requestCount: bucket.doc_count,
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
