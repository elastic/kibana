/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import { SecuritySolutionFactory } from '../../types';
import {
  UebaQueries,
  UserRulesByUser,
  UserRulesFields,
  UserRulesRequestOptions,
  UserRulesStrategyResponse,
  UsersRulesHit,
} from '../../../../../../common';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import { buildUserRulesQuery } from './query.user_rules.dsl';
import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import { formatUserRulesData } from './helpers';
import { inspectStringifyObject } from '../../../../../utils/build_query';

export const userRules: SecuritySolutionFactory<UebaQueries.userRules> = {
  buildDsl: (options: UserRulesRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }

    return buildUserRulesQuery(options);
  },
  parse: async (
    options: UserRulesRequestOptions,
    response: IEsSearchResponse<UsersRulesHit>
  ): Promise<UserRulesStrategyResponse> => {
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;

    const userRulesByUser: UserRulesByUser[] = formatUserRulesData(
      getOr([], 'aggregations.user_data.buckets', response.rawResponse)
    );
    const inspect = {
      dsl: [inspectStringifyObject(buildUserRulesQuery(options))],
    };
    return {
      ...response,
      inspect,
      data: userRulesByUser.map((user) => {
        const edges = user[UserRulesFields.rules].splice(cursorStart, querySize - cursorStart);
        const totalCount = user[UserRulesFields.ruleCount];
        const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;

        const showMorePagesIndicator = totalCount > fakeTotalCount;
        return {
          [UserRulesFields.userName]: user[UserRulesFields.userName],
          [UserRulesFields.riskScore]: user[UserRulesFields.riskScore],
          edges,
          totalCount,
          pageInfo: {
            activePage: activePage ?? 0,
            fakeTotalCount,
            showMorePagesIndicator,
          },
        };
      }),
    };
  },
};
