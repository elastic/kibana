/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import { HostsQueries } from '../../../../../../common/search_strategy/security_solution';
import {
  AuthenticationsEdges,
  AuthenticationsRequestOptions,
  AuthenticationsStrategyResponse,
  AuthenticationHit,
} from '../../../../../../common/search_strategy/security_solution/hosts/authentications';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';
import { auditdFieldsMap, buildQuery as buildAuthenticationQuery } from './dsl/query.dsl';
import { formatAuthenticationData, getHits } from './helpers';

export const authentications: SecuritySolutionFactory<HostsQueries.authentications> = {
  buildDsl: (options: AuthenticationsRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }

    return buildAuthenticationQuery(options);
  },
  parse: async (
    options: AuthenticationsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<AuthenticationsStrategyResponse> => {
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.user_count.value', response.rawResponse);

    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const hits: AuthenticationHit[] = getHits(response);
    const authenticationEdges: AuthenticationsEdges[] = hits.map((hit) =>
      formatAuthenticationData(hit, auditdFieldsMap)
    );

    const edges = authenticationEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(buildAuthenticationQuery(options))],
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
