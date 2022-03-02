/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import type {
  KpiRiskScoreRequestOptions,
  KpiRiskScoreStrategyResponse,
  RiskQueries,
} from '../../../../../../common/search_strategy';
import { RiskSeverity } from '../../../../../../common/search_strategy';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../types';
import { buildKpiRiskScoreQuery } from './query.kpi_risk_score.dsl';

interface AggBucket {
  key: RiskSeverity;
  doc_count: number;
}

export const kpiRiskScore: SecuritySolutionFactory<RiskQueries.kpiRiskScore> = {
  buildDsl: (options: KpiRiskScoreRequestOptions) => buildKpiRiskScoreQuery(options),
  parse: async (
    options: KpiRiskScoreRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<KpiRiskScoreStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildKpiRiskScoreQuery(options))],
    };

    const riskBuckets = getOr([], 'aggregations.risk.buckets', response.rawResponse);

    const result: Record<RiskSeverity, number> = riskBuckets.reduce(
      (cummulative: Record<string, number>, bucket: AggBucket) => ({
        ...cummulative,
        [bucket.key]: getOr(0, 'unique_entries.value', bucket),
      }),
      {}
    );

    return {
      ...response,
      kpiRiskScore: result,
      inspect,
    };
  },
};
