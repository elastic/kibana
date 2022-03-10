/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecuritySolutionFactory } from '../../types';
import {
  RiskScoreRequestOptions,
  RiskScoreStrategyResponse,
  RiskQueries,
} from '../../../../../../common/search_strategy';
import type { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { buildRiskScoreQuery } from './query.risk_score.dsl';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import { getTotalCount } from '../../cti/event_enrichment/helpers';

export const riskScore: SecuritySolutionFactory<RiskQueries.riskScore> = {
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
    const inspect = {
      dsl: [inspectStringifyObject(buildRiskScoreQuery(options))],
    };

    const totalCount = getTotalCount(response.rawResponse.hits.total);

    return {
      ...response,
      inspect,
      totalCount,
    };
  },
};
