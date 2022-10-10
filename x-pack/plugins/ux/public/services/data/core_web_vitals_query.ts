/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchResponse } from '@kbn/es-types';
import { UXMetrics } from '@kbn/observability-plugin/public';
import {
  TBT_FIELD,
  FCP_FIELD,
  CLS_FIELD,
  FID_FIELD,
  LCP_FIELD,
} from '../../../common/elasticsearch_fieldnames';
import { SetupUX, UxUIFilters } from '../../../typings/ui_filters';
import { mergeProjection } from '../../../common/utils/merge_projection';
import { getRumPageLoadTransactionsProjection } from './projections';

export const DEFAULT_RANKS = [100, 0, 0];

const getRanksPercentages = (ranks?: Record<string, number | null>) => {
  if (!Array.isArray(ranks)) return null;
  const ranksVal = ranks?.map(({ value }) => value?.toFixed(0) ?? 0) ?? [];
  return [
    Number(ranksVal?.[0]),
    Number(ranksVal?.[1]) - Number(ranksVal?.[0]),
    100 - Number(ranksVal?.[1]),
  ];
};

export function transformCoreWebVitalsResponse<T>(
  response?: ESSearchResponse<T, ReturnType<typeof coreWebVitalsQuery>>,
  percentile = PERCENTILE_DEFAULT
): UXMetrics | undefined {
  if (!response) return response;
  const {
    lcp,
    cls,
    fid,
    tbt,
    fcp,
    lcpRanks,
    fidRanks,
    clsRanks,
    coreVitalPages,
  } = response.aggregations ?? {};

  const pkey = percentile.toFixed(1);

  return {
    coreVitalPages: coreVitalPages?.doc_count ?? 0,
    /* Because cls is required in the type UXMetrics, and defined as number | null,
     * we need to default to null in the case where cls is undefined in order to satisfy the UXMetrics type */
    cls: cls?.values[pkey] ?? null,
    fid: fid?.values[pkey],
    lcp: lcp?.values[pkey],
    tbt: tbt?.values[pkey] ?? 0,
    fcp: fcp?.values[pkey],

    lcpRanks: lcp?.values[pkey]
      ? getRanksPercentages(lcpRanks?.values) ?? DEFAULT_RANKS
      : DEFAULT_RANKS,
    fidRanks: fid?.values[pkey]
      ? getRanksPercentages(fidRanks?.values) ?? DEFAULT_RANKS
      : DEFAULT_RANKS,
    clsRanks: cls?.values[pkey]
      ? getRanksPercentages(clsRanks?.values) ?? DEFAULT_RANKS
      : DEFAULT_RANKS,
  };
}

export const PERCENTILE_DEFAULT = 50;

export function coreWebVitalsQuery(
  start: number,
  end: number,
  urlQuery?: string,
  uiFilters?: UxUIFilters,
  percentile = PERCENTILE_DEFAULT
) {
  const setup: SetupUX = { uiFilters: uiFilters ?? {} };

  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery,
    start,
    end,
  });
  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: {
          filter: [...projection.body.query.bool.filter],
        },
      },
      aggs: {
        coreVitalPages: {
          filter: {
            exists: {
              field: 'transaction.experience',
            },
          },
        },
        lcp: {
          percentiles: {
            field: LCP_FIELD,
            percents: [percentile],
          },
        },
        fid: {
          percentiles: {
            field: FID_FIELD,
            percents: [percentile],
          },
        },
        cls: {
          percentiles: {
            field: CLS_FIELD,
            percents: [percentile],
          },
        },
        tbt: {
          percentiles: {
            field: TBT_FIELD,
            percents: [percentile],
          },
        },
        fcp: {
          percentiles: {
            field: FCP_FIELD,
            percents: [percentile],
          },
        },
        lcpRanks: {
          percentile_ranks: {
            field: LCP_FIELD,
            values: [2500, 4000],
            keyed: false,
          },
        },
        fidRanks: {
          percentile_ranks: {
            field: FID_FIELD,
            values: [100, 300],
            keyed: false,
          },
        },
        clsRanks: {
          percentile_ranks: {
            field: CLS_FIELD,
            values: [0.1, 0.25],
            keyed: false,
          },
        },
      },
    },
  });
  return params;
}
