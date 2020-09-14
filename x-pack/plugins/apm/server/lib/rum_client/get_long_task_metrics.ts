/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getRumLongTasksProjection,
  getRumOverviewProjection,
} from '../../projections/rum_overview';
import { mergeProjection } from '../../projections/util/merge_projection';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';
import { SPAN_DURATION } from '../../../common/elasticsearch_fieldnames';

export async function getLongTaskMetrics({
  setup,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const projection = getRumLongTasksProjection({
    setup,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: projection.body.query.bool,
      },
      aggs: {
        noOfLongTasks: { value_count: { field: 'span.type' } },
        longTaskSum: {
          sum: {
            field: SPAN_DURATION,
          },
        },
        longTaskMax: {
          max: {
            field: SPAN_DURATION,
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(params);
  return response.aggregations!;
}

async function filterPageLoadTransactions(
  setup: Setup & SetupTimeRange & SetupUIFilters,
  transactionIds: string[]
) {
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
        noOfLongTasks: { value_count: { field: 'span.type' } },
        longTaskSum: {
          sum: {
            field: SPAN_DURATION,
          },
        },
        longTaskMax: {
          max: {
            field: SPAN_DURATION,
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(params);
  return response.aggregations!;
}
