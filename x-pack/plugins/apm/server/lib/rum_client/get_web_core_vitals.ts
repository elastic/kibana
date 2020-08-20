/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRumOverviewProjection } from '../../projections/rum_overview';
import { mergeProjection } from '../../projections/util/merge_projection';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';
import {
  CLS_FIELD,
  FCP_FIELD,
  FID_FIELD,
  LCP_FIELD,
  TBT_FIELD,
} from '../../../common/elasticsearch_fieldnames';

export async function getWebCoreVitals({
  setup,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const projection = getRumOverviewProjection({
    setup,
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
                'user_agent.name': 'Chrome',
              },
            },
          ],
        },
      },
      aggs: {
        fcp: {
          avg: {
            field: FCP_FIELD,
          },
        },
        fcpRanks: {
          percentile_ranks: {
            field: FCP_FIELD,
            values: [1000, 2000],
            keyed: false,
          },
        },
        lcp: {
          avg: {
            field: LCP_FIELD,
          },
        },
        lcpRanks: {
          percentile_ranks: {
            field: LCP_FIELD,
            values: [2500, 4000],
            keyed: false,
          },
        },
        tbt: {
          avg: {
            field: TBT_FIELD,
          },
        },
        cls: {
          avg: {
            field: CLS_FIELD,
          },
        },
        fid: {
          avg: {
            field: FID_FIELD,
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
        tbtRanks: {
          percentile_ranks: {
            field: TBT_FIELD,
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
    fcp,
    lcp,
    tbt,
    cls,
    fid,
    lcpRanks,
    fcpRanks,
    fidRanks,
    clsRanks,
    tbtRanks,
  } = response.aggregations!;

  const getRanksPercentages = (
    ranks: Array<{ key: number; value: number }>
  ) => {
    const ranksVal = (ranks ?? [0, 0]).map(
      ({ value }) => value?.toFixed(0) ?? 0
    );
    return [+ranksVal?.[0], ranksVal?.[1] - ranksVal?.[0], 100 - ranksVal?.[1]];
  };

  // Divide by 1000 to convert ms into seconds
  return {
    cls: cls?.value,
    fid: fid?.value,
    tbt: ((tbt?.value ?? 0) / 1000).toFixed(2),
    fcp: ((fcp?.value ?? 0) / 1000).toFixed(2),
    lcp: ((lcp?.value ?? 0) / 1000).toFixed(2),

    lcpRanks: getRanksPercentages(lcpRanks.values),
    tbtRanks: getRanksPercentages(tbtRanks.values),
    fcpRanks: getRanksPercentages(fcpRanks.values),
    fidRanks: getRanksPercentages(fidRanks.values),
    clsRanks: getRanksPercentages(clsRanks.values),
  };
}
