/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import {
  HostAggEsItem,
  HostsStrategyResponse,
  HostsQueries,
  HostsRequestOptions,
} from '../../../../../../common/search_strategy/security_solution/hosts';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';
import { buildHostsQuery } from './query.all_hosts.dsl';
import { formatHostEdgesData, HOSTS_FIELDS } from './helpers';

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
    const hostsEdges = buckets.map((bucket) => formatHostEdgesData(HOSTS_FIELDS, bucket));
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = hostsEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(buildHostsQuery(options))],
    };
    const showMorePagesIndicator = totalCount > fakeTotalCount;

    return {
      ...response,
      inspect,
      edges,
      totalCount,
      pageInfo: {
        activePage: activePage ?? 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
    };
  },
};
