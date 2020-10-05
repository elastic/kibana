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
  USER_AGENT_NAME,
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
          filter: [
            ...projection.body.query.bool.filter,
            {
              term: {
                [USER_AGENT_NAME]: 'Chrome',
              },
            },
          ],
        },
      },
      aggs: {
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
  const { lcp, cls, fid, tbt, fcp, lcpRanks, fidRanks, clsRanks } =
    response.aggregations ?? {};

  const getRanksPercentages = (
    ranks: Array<{ key: number; value: number }>
  ) => {
    const ranksVal = ranks.map(({ value }) => value?.toFixed(0) ?? 0);
    return [
      Number(ranksVal?.[0]),
      Number(ranksVal?.[1]) - Number(ranksVal?.[0]),
      100 - Number(ranksVal?.[1]),
    ];
  };

  const defaultRanks = [
    { value: 0, key: 0 },
    { value: 0, key: 0 },
  ];

  const pkey = percentile.toFixed(1);

  // Divide by 1000 to convert ms into seconds
  return {
    cls: String(cls?.values[pkey]?.toFixed(2) || 0),
    fid: fid?.values[pkey] ?? 0,
    lcp: lcp?.values[pkey] ?? 0,
    tbt: tbt?.values[pkey] ?? 0,
    fcp: fcp?.values[pkey] ?? 0,

    lcpRanks: getRanksPercentages(lcpRanks?.values ?? defaultRanks),
    fidRanks: getRanksPercentages(fidRanks?.values ?? defaultRanks),
    clsRanks: getRanksPercentages(clsRanks?.values ?? defaultRanks),
  };
}
