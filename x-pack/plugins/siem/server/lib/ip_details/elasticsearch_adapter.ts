/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr } from 'lodash/fp';

import {
  AutonomousSystem,
  GeoEcsFields,
  HostEcsFields,
  IpOverviewData,
  UsersData,
  UsersEdges,
} from '../../graphql/types';
import { inspectStringifyObject } from '../../utils/build_query';
import { DatabaseSearchResponse, FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../common/constants';
import { IpOverviewRequestOptions, UsersRequestOptions } from './index';
import { buildOverviewQuery } from './query_overview.dsl';
import { buildUsersQuery } from './query_users.dsl';

import {
  IpDetailsAdapter,
  IpOverviewHit,
  OverviewHit,
  OverviewHostHit,
  UsersBucketsItem,
} from './types';

export class ElasticsearchIpDetailsAdapter implements IpDetailsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getIpDetails(
    request: FrameworkRequest,
    options: IpOverviewRequestOptions
  ): Promise<IpOverviewData> {
    const dsl = buildOverviewQuery(options);
    const response = await this.framework.callWithRequest<IpOverviewHit, TermAggregation>(
      request,
      'search',
      dsl
    );

    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };

    return {
      inspect,
      ...getIpOverviewAgg('source', getOr({}, 'aggregations.source', response)),
      ...getIpOverviewAgg('destination', getOr({}, 'aggregations.destination', response)),
      ...getIpOverviewHostAgg(getOr({}, 'aggregations.host', response)),
    };
  }

  public async getUsers(
    request: FrameworkRequest,
    options: UsersRequestOptions
  ): Promise<UsersData> {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    const dsl = buildUsersQuery(options);
    const response = await this.framework.callWithRequest<UsersData, TermAggregation>(
      request,
      'search',
      dsl
    );

    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.user_count.value', response);
    const usersEdges = getUsersEdges(response);
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = usersEdges.splice(cursorStart, querySize - cursorStart);
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

export const getIpOverviewAgg = (type: string, overviewHit: OverviewHit | {}) => {
  const firstSeen = getOr(null, `firstSeen.value_as_string`, overviewHit);
  const lastSeen = getOr(null, `lastSeen.value_as_string`, overviewHit);
  const autonomousSystem: AutonomousSystem | null = getOr(
    null,
    `as.results.hits.hits[0]._source.${type}.as`,
    overviewHit
  );
  const geoFields: GeoEcsFields | null = getOr(
    null,
    `geo.results.hits.hits[0]._source.${type}.geo`,
    overviewHit
  );

  return {
    [type]: {
      firstSeen,
      lastSeen,
      autonomousSystem: {
        ...autonomousSystem,
      },
      geo: {
        ...geoFields,
      },
    },
  };
};

export const getIpOverviewHostAgg = (overviewHostHit: OverviewHostHit | {}) => {
  const hostFields: HostEcsFields | null = getOr(
    null,
    `results.hits.hits[0]._source.host`,
    overviewHostHit
  );
  return {
    host: {
      ...hostFields,
    },
  };
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
