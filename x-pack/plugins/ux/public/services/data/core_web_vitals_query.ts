/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export const PERCENTILE_DEFAULT = 50;

export function coreWebVitalsQuery(
  start: number,
  end: number,
  urlQuery?: string,
  uiFilters?: UxUIFilters,
  percentile = PERCENTILE_DEFAULT
) {
  const setup: SetupUX = { uiFilters: uiFilters ? uiFilters : {} };

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
  const { apm, ...rest } = params;
  return rest;
}
