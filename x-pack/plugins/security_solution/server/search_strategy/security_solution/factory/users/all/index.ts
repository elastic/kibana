/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';
import { buildUsersQuery } from './query.all_users.dsl';
import { UsersQueries } from '../../../../../../common/search_strategy/security_solution/users';
import {
  UsersRequestOptions,
  UsersStrategyResponse,
} from '../../../../../../common/search_strategy/security_solution/users/all';
import { AllUsersAggEsItem } from '../../../../../../common/search_strategy/security_solution/users/common';

export const allUsers: SecuritySolutionFactory<UsersQueries.users> = {
  buildDsl: (options: UsersRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    return buildUsersQuery(options);
  },
  parse: async (
    options: UsersRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<UsersStrategyResponse> => {
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const inspect = {
      dsl: [inspectStringifyObject(buildUsersQuery(options))],
    };

    const buckets: AllUsersAggEsItem[] = getOr(
      [],
      'aggregations.user_data.buckets',
      response.rawResponse
    );

    const totalCount = getOr(0, 'aggregations.user_count.value', response.rawResponse);

    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;

    const users = buckets.map(
      (bucket: AllUsersAggEsItem) => ({
        name: bucket.key,
        lastSeen: getOr(null, `lastSeen.value_as_string`, bucket),
        domain: getOr(null, `domain.hits.hits[0].fields['user.domain']`, bucket),
      }),
      {}
    );

    const showMorePagesIndicator = totalCount > fakeTotalCount;
    return {
      ...response,
      inspect,
      totalCount,
      users: users.splice(cursorStart, querySize - cursorStart),
      pageInfo: {
        activePage: activePage ?? 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
    };
  },
};
