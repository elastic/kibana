/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import { SecuritySolutionFactory } from '../../types';
import {
  HostsQueries,
  RiskScoreBetterEdges,
  RiskScoreBetterRequestOptions,
  RiskScoreBetterStrategyResponse,
} from '../../../../../../common/search_strategy';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import { buildRiskScoreBetterQuery } from './query.risk_score_better.dsl';
import type { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import { formatRiskScoreBetterData } from './helpers';
import { inspectStringifyObject } from '../../../../../utils/build_query';

export const riskScoreBetter: SecuritySolutionFactory<HostsQueries.riskScoreBetter> = {
  buildDsl: (options: RiskScoreBetterRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }

    return buildRiskScoreBetterQuery(options);
  },
  parse: async (
    options: RiskScoreBetterRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<RiskScoreBetterStrategyResponse> => {
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.host_count.value', response.rawResponse);
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;

    const riskScoreBetterEdges: RiskScoreBetterEdges[] = formatRiskScoreBetterData(
      getOr([], 'aggregations.host_data.buckets', response.rawResponse)
    );

    const edges = riskScoreBetterEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(buildRiskScoreBetterQuery(options))],
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
