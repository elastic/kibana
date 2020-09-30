/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import {
  HostsQueries,
  AuthenticationsEdges,
  HostAuthenticationsRequestOptions,
  HostAuthenticationsStrategyResponse,
  AuthenticationHit,
} from '../../../../../../common/search_strategy/security_solution/hosts';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';
import { auditdFieldsMap, buildQuery as buildAuthenticationQuery } from './dsl/query.dsl';
import { authenticationsFields, formatAuthenticationData, getHits } from './helpers';

export const authentications: SecuritySolutionFactory<HostsQueries.authentications> = {
  buildDsl: (options: HostAuthenticationsRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }

    return buildAuthenticationQuery(options);
  },
  parse: async (
    options: HostAuthenticationsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<HostAuthenticationsStrategyResponse> => {
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.user_count.value', response.rawResponse);

    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const hits: AuthenticationHit[] = getHits(response);
    const authenticationEdges: AuthenticationsEdges[] = hits.map((hit) =>
      formatAuthenticationData(authenticationsFields, hit, auditdFieldsMap)
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
        activePage: activePage ?? 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
    };
  },
};
