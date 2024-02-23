/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchResponse } from '@kbn/es-types';
import { UXMetrics } from '@kbn/observability-shared-plugin/public/types';
import { DEFAULT_RANKS, getRanksPercentages } from './core_web_vitals_query';
import { INP_FIELD } from '../../../common/elasticsearch_fieldnames';
import { SetupUX, UxUIFilters } from '../../../typings/ui_filters';
import { mergeProjection } from '../../../common/utils/merge_projection';
import { getRumPageExitTransactionsProjection } from './projections';

export function transformINPResponse<T>(
  response?: ESSearchResponse<
    T,
    ReturnType<typeof inpQuery>,
    { restTotalHitsAsInt: false }
  >,
  percentile = PERCENTILE_DEFAULT
): UXMetrics | undefined {
  if (!response) return response;
  const { inp, inpRanks } = response.aggregations ?? {};

  const pkey = percentile.toFixed(1);

  return {
    hasINP: response.hits.total.value > 0,
    inp: inp?.values[pkey],
    inpRanks: inp?.values[pkey]
      ? getRanksPercentages(inpRanks?.values) ?? DEFAULT_RANKS
      : DEFAULT_RANKS,
  };
}

export const PERCENTILE_DEFAULT = 50;

export function inpQuery(
  start: number,
  end: number,
  urlQuery?: string,
  uiFilters?: UxUIFilters,
  percentile = PERCENTILE_DEFAULT
) {
  const setup: SetupUX = { uiFilters: uiFilters ?? {} };

  const projection = getRumPageExitTransactionsProjection({
    setup,
    urlQuery,
    start,
    end,
  });
  return mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: {
          filter: [...projection.body.query.bool.filter],
        },
      },
      aggs: {
        inp: {
          percentiles: {
            field: INP_FIELD,
            percents: [percentile],
          },
        },

        inpRanks: {
          percentile_ranks: {
            field: INP_FIELD,
            values: [200, 500],
            keyed: false,
          },
        },
      },
    },
  });
}
