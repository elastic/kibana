/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr } from 'lodash/fp';

import { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../common/constants';
import { FactoryQueryTypes } from '../../../../../common/search_strategy/security_solution';
import {
  HostsStrategyResponse,
  HostOverviewStrategyResponse,
  HostsQueries,
  HostsRequestOptions,
  HostOverviewRequestOptions,
} from '../../../../../common/search_strategy/security_solution/hosts';

// TO DO need to move all this types in common
import { HostAggEsData, HostAggEsItem } from '../../../../lib/hosts/types';

import { inspectStringifyObject } from '../../../../utils/build_query';
import { SecuritySolutionFactory } from '../types';
import { buildHostOverviewQuery } from './dsl/query.detail_host.dsl';
import { buildHostsQuery } from './dsl/query.hosts.dsl';
import { formatHostEdgesData, formatHostItem } from './helpers';

export const allHosts: SecuritySolutionFactory<HostsQueries.hosts> = {
  buildDsl: (options: HostsRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    return buildHostsQuery(options);
  },
  parse: async (
    options: HostsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<HostsStrategyResponse> => {
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.host_count.value', response.rawResponse);
    const buckets: HostAggEsItem[] = getOr(
      [],
      'aggregations.host_data.buckets',
      response.rawResponse
    );
    const hostsEdges = buckets.map((bucket) => formatHostEdgesData(bucket));
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = hostsEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(buildHostsQuery(options))],
      response: [inspectStringifyObject(response)],
    };
    const showMorePagesIndicator = totalCount > fakeTotalCount;

    return {
      ...response,
      inspect,
      edges,
      totalCount,
      pageInfo: {
        activePage: activePage ? activePage : 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
    };
  },
};

export const overviewHost: SecuritySolutionFactory<HostsQueries.hostOverview> = {
  buildDsl: (options: HostOverviewRequestOptions) => {
    return buildHostOverviewQuery(options);
  },
  parse: async (
    options: HostOverviewRequestOptions,
    response: IEsSearchResponse<HostAggEsData>
  ): Promise<HostOverviewStrategyResponse> => {
    const aggregations: HostAggEsItem = get('aggregations', response.rawResponse) || {};
    const inspect = {
      dsl: [inspectStringifyObject(buildHostOverviewQuery(options))],
      response: [inspectStringifyObject(response)],
    };
    const formattedHostItem = formatHostItem(aggregations);
    return { ...response, inspect, _id: options.hostName, ...formattedHostItem };
  },
};

export const hostsFactory: Record<HostsQueries, SecuritySolutionFactory<FactoryQueryTypes>> = {
  [HostsQueries.hosts]: allHosts,
  [HostsQueries.hostOverview]: overviewHost,
};
