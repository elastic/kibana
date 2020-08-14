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
        bool: projection.body.query.bool,
      },
      aggs: {
        fcp: {
          avg: {
            field: 'transaction.marks.agent.firstContentfulPaint',
            missing: 0,
          },
        },
        lcp: {
          avg: {
            field: 'transaction.marks.agent.largestContentfulPaint',
            missing: 0,
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(params);
  const { fcp, lcp } = response.aggregations!;

  // Divide by 1000 to convert ms into seconds
  return {
    fcp: fcp.value / 1000,
    lcp: lcp.value / 1000,
  };
}
