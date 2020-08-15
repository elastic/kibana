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
            field: 'transaction.marks.agent.firstContentfulPaint',
          },
        },
        fcpRanks: {
          percentile_ranks: {
            field: 'transaction.marks.agent.firstContentfulPaint',
            values: [1000, 2000],
            keyed: false,
          },
        },
        lcp: {
          avg: {
            field: 'transaction.marks.agent.largestContentfulPaint',
          },
        },
        lcpRanks: {
          percentile_ranks: {
            field: 'transaction.marks.agent.largestContentfulPaint',
            values: [2500, 4000],
            keyed: false,
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(params);
  const { fcp, lcp, fcpRanks, lcpRanks } = response.aggregations!;

  // Divide by 1000 to convert ms into seconds
  return {
    fcpRanks: fcpRanks.values.map(({ key, value }) => ({
      key: key / 1000,
      value: value?.toFixed(0) ?? 0,
    })),
    lcpRanks: lcpRanks.values.map(({ key, value }) => ({
      key: key / 1000,
      value: value?.toFixed(0) ?? 0,
    })),
    fcp: (fcp?.value ?? 0) / 1000,
    lcp: (lcp?.value ?? 0) / 1000,
  };
}
