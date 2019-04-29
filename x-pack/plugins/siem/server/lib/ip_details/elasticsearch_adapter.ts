/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr } from 'lodash/fp';

import {
  AutonomousSystem,
  DomainsData,
  DomainsEdges,
  FirstLastSeenDomain,
  FlowTarget,
  GeoEcsFields,
  HostEcsFields,
  IpOverviewData,
  TlsData,
  TlsEdges,
  UsersData,
  UsersEdges,
} from '../../graphql/types';
import { DatabaseSearchResponse, FrameworkAdapter, FrameworkRequest } from '../framework';
import { SearchHit, TermAggregation } from '../types';

import {
  DomainsRequestOptions,
  IpOverviewRequestOptions,
  TlsRequestOptions,
  UsersRequestOptions,
} from './index';
import { buildDomainsQuery } from './query_domains.dsl';
import { buildFirstLastSeenDomainQuery } from './query_last_first_seen_domain.dsl';
import { buildOverviewQuery } from './query_overview.dsl';
import {
  DomainFirstLastSeenItem,
  DomainFirstLastSeenRequestOptions,
  DomainsBuckets,
  IpDetailsAdapter,
  IpOverviewHit,
  OverviewHit,
  TlsBuckets,
  UsersBucketsItem,
} from './types';

import { buildTlsQuery } from './query_tls.dsl';

import { buildUsersQuery } from './query_users.dsl';

export class ElasticsearchIpOverviewAdapter implements IpDetailsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getIpDetails(
    request: FrameworkRequest,
    options: IpOverviewRequestOptions
  ): Promise<IpOverviewData> {
    const response = await this.framework.callWithRequest<IpOverviewHit, TermAggregation>(
      request,
      'search',
      buildOverviewQuery(options)
    );
    return {
      ...getIpOverviewAgg('source', getOr({}, 'aggregations.source', response)),
      ...getIpOverviewAgg('destination', getOr({}, 'aggregations.destination', response)),
    };
  }

  public async getDomains(
    request: FrameworkRequest,
    options: DomainsRequestOptions
  ): Promise<DomainsData> {
    const response = await this.framework.callWithRequest<DomainsData, TermAggregation>(
      request,
      'search',
      buildDomainsQuery(options)
    );

    const { cursor, limit } = options.pagination;
    const totalCount = getOr(0, 'aggregations.domain_count.value', response);
    const domainsEdges: DomainsEdges[] = getDomainsEdges(response, options);
    const hasNextPage = domainsEdges.length > limit;
    const beginning = cursor != null ? parseInt(cursor, 10) : 0;
    const edges = domainsEdges.splice(beginning, limit - beginning);

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

  public async getTls(request: FrameworkRequest, options: TlsRequestOptions): Promise<TlsData> {
    const response = await this.framework.callWithRequest<TlsData, TermAggregation>(
      request,
      'search',
      buildTlsQuery(options)
    );

    const { cursor, limit } = options.pagination;
    const totalCount = getOr(0, 'aggregations.count.value', response);
    const tlsEdges: TlsEdges[] = getTlsEdges(response, options);
    const hasNextPage = tlsEdges.length > limit;
    const beginning = cursor != null ? parseInt(cursor, 10) : 0;
    const edges = tlsEdges.splice(beginning, limit - beginning);

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

  public async getDomainsFirstLastSeen(
    request: FrameworkRequest,
    options: DomainFirstLastSeenRequestOptions
  ): Promise<FirstLastSeenDomain> {
    const response = await this.framework.callWithRequest<SearchHit, TermAggregation>(
      request,
      'search',
      buildFirstLastSeenDomainQuery(options)
    );

    const aggregations: DomainFirstLastSeenItem = get('aggregations', response) || {};
    return {
      firstSeen: get('firstSeen.value_as_string', aggregations),
      lastSeen: get('lastSeen.value_as_string', aggregations),
    };
  }

  public async getUsers(
    request: FrameworkRequest,
    options: UsersRequestOptions
  ): Promise<UsersData> {
    const response = await this.framework.callWithRequest<UsersData, TermAggregation>(
      request,
      'search',
      buildUsersQuery(options)
    );

    const { cursor, limit } = options.pagination;
    const totalCount = getOr(0, 'aggregations.user_count.value', response);
    const usersEdges = getUsersEdges(response);
    const hasNextPage = usersEdges.length > limit;
    const beginning = cursor != null ? parseInt(cursor, 10) : 0;
    const edges = usersEdges.splice(beginning, limit - beginning);

    return {
      edges,
      totalCount,
      pageInfo: {
        endCursor: {
          value: String(limit),
          tiebreaker: null,
        },
        hasNextPage,
      },
    };
  }
}

export const getIpOverviewAgg = (type: string, overviewHit: OverviewHit | {}) => {
  const firstSeen = getOr(null, `firstSeen.value_as_string`, overviewHit);
  const lastSeen = getOr(null, `lastSeen.value_as_string`, overviewHit);

  const autonomousSystem: AutonomousSystem | null = getOr(
    null,
    `autonomousSystem.results.hits.hits[0]._source.autonomous_system`,
    overviewHit
  );
  const geoFields: GeoEcsFields | null = getOr(
    null,
    `geo.results.hits.hits[0]._source.${type}.geo`,
    overviewHit
  );
  const hostFields: HostEcsFields | null = getOr(
    null,
    `host.results.hits.hits[0]._source.host`,
    overviewHit
  );

  return {
    [type]: {
      firstSeen,
      lastSeen,
      autonomousSystem: {
        ...autonomousSystem,
      },
      host: {
        ...hostFields,
      },
      geo: {
        ...geoFields,
      },
    },
  };
};

const getDomainsEdges = (
  response: DatabaseSearchResponse<DomainsData, TermAggregation>,
  options: DomainsRequestOptions
): DomainsEdges[] => {
  return formatDomainsEdges(
    getOr([], `aggregations.${options.flowTarget}_domains.buckets`, response),
    options.flowTarget
  );
};

export const formatDomainsEdges = (
  buckets: DomainsBuckets[],
  flowTarget: FlowTarget
): DomainsEdges[] =>
  buckets.map((bucket: DomainsBuckets) => ({
    node: {
      _id: bucket.key,
      [flowTarget]: {
        uniqueIpCount: getOrNumber('uniqueIpCount.value', bucket),
        domainName: bucket.key,
        firstSeen: get('firstSeen.value_as_string', bucket),
        lastSeen: get('lastSeen.value_as_string', bucket),
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

const getTlsEdges = (
  response: DatabaseSearchResponse<TlsData, TermAggregation>,
  options: TlsRequestOptions
): TlsEdges[] => {
  return formatTlsEdges(getOr([], 'aggregations.sha1.buckets', response));
};

export const formatTlsEdges = (buckets: TlsBuckets[]): TlsEdges[] => {
  return buckets.map((bucket: TlsBuckets) => {
    const edge: TlsEdges = {
      node: {
        _id: bucket.key,
        alternativeNames: bucket.alternative_names.buckets.map(({ key }) => key),
        commonNames: bucket.common_names.buckets.map(({ key }) => key),
        ja3: bucket.ja3.buckets.map(({ key }) => key),
        issuerNames: bucket.issuer_names.buckets.map(({ key }) => key),
        // eslint-disable-next-line @typescript-eslint/camelcase
        notAfter: bucket.not_after.buckets.map(({ key_as_string }) => key_as_string),
      },
      cursor: {
        value: bucket.key,
        tiebreaker: null,
      },
    };
    return edge;
  });
};

const getOrNumber = (path: string, bucket: DomainsBuckets) => {
  const numb = get(path, bucket);
  if (numb == null) {
    return null;
  }
  return numb;
};

export const getUsersEdges = (
  response: DatabaseSearchResponse<UsersData, TermAggregation>
): UsersEdges[] =>
  getOr([], `aggregations.users.buckets`, response).map((bucket: UsersBucketsItem) => ({
    node: {
      _id: bucket.key,
      user: {
        id: getOr([], 'id.buckets', bucket).map((id: UsersBucketsItem) => id.key),
        name: bucket.key,
        groupId: getOr([], 'groupId.buckets', bucket).map(
          (groupId: UsersBucketsItem) => groupId.key
        ),
        groupName: getOr([], 'groupName.buckets', bucket).map(
          (groupName: UsersBucketsItem) => groupName.key
        ),
        count: get('doc_count', bucket),
      },
    },
    cursor: {
      value: bucket.key,
      tiebreaker: null,
    },
  }));
