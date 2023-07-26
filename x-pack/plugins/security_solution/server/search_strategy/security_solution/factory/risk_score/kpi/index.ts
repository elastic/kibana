/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type {
  KpiRiskScoreStrategyResponse,
  RiskQueries,
  RiskSeverity,
} from '../../../../../../common/search_strategy';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../types';
import { buildKpiRiskScoreQuery } from './query.kpi_risk_score.dsl';
import { parseOptions } from './parse_options';

interface AggBucket {
  key: RiskSeverity;
  doc_count: number;
}

export const kpiRiskScore: SecuritySolutionFactory<RiskQueries.kpiRiskScore> = {
  buildDsl: (maybeOptions: unknown) => {
    const options = parseOptions(maybeOptions);

    return buildKpiRiskScoreQuery(options);
  },
  parse: async (
    maybeOptions: unknown,
    response: IEsSearchResponse<unknown>
  ): Promise<KpiRiskScoreStrategyResponse> => {
    const options = parseOptions(maybeOptions);

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
