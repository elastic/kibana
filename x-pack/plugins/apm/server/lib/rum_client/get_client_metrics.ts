/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRumOverviewProjection } from '../../../common/projections/rum_overview';
import { mergeProjection } from '../../../common/projections/util/merge_projection';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';

export async function getClientMetrics({
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
        pageViews: { value_count: { field: 'transaction.type' } },
        backEnd: {
          avg: {
            field: 'transaction.marks.agent.timeToFirstByte',
            missing: 0,
          },
        },
        domInteractive: {
          avg: {
            field: 'transaction.marks.agent.domInteractive',
            missing: 0,
          },
        },
      },
    },
  });

  const { client } = setup;

  const response = await client.search(params);
  const { backEnd, domInteractive, pageViews } = response.aggregations!;

  return {
    pageViews,
    backEnd,
    frontEnd: { value: domInteractive.value! - backEnd.value! },
  };
}
