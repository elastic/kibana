/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import { SecuritySolutionFactory } from '../../types';
import {
  RiskScoreEdges,
  RiskScoreRequestOptions,
  RiskScoreStrategyResponse,
  UebaQueries,
} from '../../../../../../common';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import { buildRiskScoreQuery } from './query.risk_score.dsl';
import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import { formatRiskScoreData } from './helpers';
import { inspectStringifyObject } from '../../../../../utils/build_query';

export const riskScore: SecuritySolutionFactory<UebaQueries.riskScore> = {
  buildDsl: (options: RiskScoreRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }

    return buildRiskScoreQuery(options);
  },
  parse: async (
    options: RiskScoreRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<RiskScoreStrategyResponse> => {
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.host_count.value', response.rawResponse);
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;

    const riskScoreEdges: RiskScoreEdges[] = formatRiskScoreData(
      getOr([], 'aggregations.host_data.buckets', response.rawResponse)
    );

    const edges = riskScoreEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(buildRiskScoreQuery(options))],
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
