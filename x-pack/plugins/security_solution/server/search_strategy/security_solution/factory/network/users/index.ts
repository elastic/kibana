/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import {
  NetworkUsersStrategyResponse,
  NetworkQueries,
  NetworkUsersRequestOptions,
} from '../../../../../../common/search_strategy/security_solution/network';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';

import { getUsersEdges } from './helpers';
import { buildUsersQuery } from './query.users_network.dsl';

export const networkUsers: SecuritySolutionFactory<NetworkQueries.users> = {
  buildDsl: (options: NetworkUsersRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    return buildUsersQuery(options);
  },
  parse: async (
    options: NetworkUsersRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<NetworkUsersStrategyResponse> => {
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.user_count.value', response.rawResponse);
    const usersEdges = getUsersEdges(response);
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = usersEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(buildUsersQuery(options))],
    };
    const showMorePagesIndicator = totalCount > fakeTotalCount;

    return {
      ...response,
      edges,
      inspect,
      pageInfo: {
        activePage: activePage ?? 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
      totalCount,
    };
  },
};
