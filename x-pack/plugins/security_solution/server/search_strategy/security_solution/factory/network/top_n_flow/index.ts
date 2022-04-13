/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import {
  NetworkTopNFlowStrategyResponse,
  NetworkQueries,
  NetworkTopNFlowRequestOptions,
  NetworkTopNFlowEdges,
} from '../../../../../../common/search_strategy/security_solution/network';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';

import { getTopNFlowEdges } from './helpers';
import { buildTopNFlowQuery } from './query.top_n_flow_network.dsl';

export const networkTopNFlow: SecuritySolutionFactory<NetworkQueries.topNFlow> = {
  buildDsl: (options: NetworkTopNFlowRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    return buildTopNFlowQuery(options);
  },
  parse: async (
    options: NetworkTopNFlowRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<NetworkTopNFlowStrategyResponse> => {
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.top_n_flow_count.value', response.rawResponse);
    const networkTopNFlowEdges: NetworkTopNFlowEdges[] = getTopNFlowEdges(response, options);
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = networkTopNFlowEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(buildTopNFlowQuery(options))],
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
