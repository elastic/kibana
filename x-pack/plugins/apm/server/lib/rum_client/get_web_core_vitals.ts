/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRumPageLoadTransactionsProjection } from '../../projections/rum_page_load_transactions';
import { mergeProjection } from '../../projections/util/merge_projection';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import {
  CLS_FIELD,
  FCP_FIELD,
  FID_FIELD,
  LCP_FIELD,
  TBT_FIELD,
} from '../../../common/elasticsearch_fieldnames';

export async function getWebCoreVitals({
  setup,
  urlQuery,
  percentile = 50,
}: {
  setup: Setup & SetupTimeRange;
  urlQuery?: string;
  percentile?: number;
}) {
  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery,
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

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(params);
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

  const getRanksPercentages = (
    ranks?: Array<{ key: number; value: number }>
  ) => {
    const ranksVal = ranks?.map(({ value }) => value?.toFixed(0) ?? 0) ?? [];
    return [
      Number(ranksVal?.[0]),
      Number(ranksVal?.[1]) - Number(ranksVal?.[0]),
      100 - Number(ranksVal?.[1]),
    ];
  };

  const defaultRanks = [100, 0, 0];

  const pkey = percentile.toFixed(1);

  return {
    coreVitalPages: coreVitalPages?.doc_count ?? 0,
    cls: cls?.values[pkey]?.toFixed(3) || null,
    fid: fid?.values[pkey],
    lcp: lcp?.values[pkey],
    tbt: tbt?.values[pkey] ?? 0,
    fcp: fcp?.values[pkey],

    lcpRanks: lcp?.values[pkey]
      ? getRanksPercentages(lcpRanks?.values)
      : defaultRanks,
    fidRanks: fid?.values[pkey]
      ? getRanksPercentages(fidRanks?.values)
      : defaultRanks,
    clsRanks: cls?.values[pkey]
      ? getRanksPercentages(clsRanks?.values)
      : defaultRanks,
  };
}
