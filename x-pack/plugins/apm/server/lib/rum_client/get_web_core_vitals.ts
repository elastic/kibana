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
  FID_FIELD,
  LCP_FIELD,
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
        lcp: {
          percentiles: {
            field: LCP_FIELD,
            percents: [50],
          },
        },
        fid: {
          percentiles: {
            field: FID_FIELD,
            percents: [50],
          },
        },
        cls: {
          percentiles: {
            field: CLS_FIELD,
            percents: [50],
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
    lcpRanks,
    fidRanks,
    clsRanks,
  } = response.aggregations!;

  const getRanksPercentages = (
    ranks: Array<{ key: number; value: number }>
  ) => {
    const ranksVal = (ranks ?? [0, 0]).map(
      ({ value }) => value?.toFixed(0) ?? 0
    );
    return [
      Number(ranksVal?.[0]),
      Number(ranksVal?.[1]) - Number(ranksVal?.[0]),
      100 - Number(ranksVal?.[1]),
    ];
  };

  // Divide by 1000 to convert ms into seconds
  return {
    cls: String(cls.values['50.0']?.toFixed(2) || 0),
    fid: ((fid.values['50.0'] || 0) / 1000).toFixed(2),
    lcp: ((lcp.values['50.0'] || 0) / 1000).toFixed(2),

    lcpRanks: getRanksPercentages(lcpRanks.values),
    fidRanks: getRanksPercentages(fidRanks.values),
    clsRanks: getRanksPercentages(clsRanks.values),
  };
}
