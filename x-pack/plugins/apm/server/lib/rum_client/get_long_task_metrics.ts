/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRumPageLoadTransactionsProjection } from '../../projections/rum_page_load_transactions';
import { mergeProjection } from '../../projections/util/merge_projection';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

const LONG_TASK_SUM_FIELD = 'transaction.experience.longtask.sum';
const LONG_TASK_COUNT_FIELD = 'transaction.experience.longtask.count';
const LONG_TASK_MAX_FIELD = 'transaction.experience.longtask.max';

export async function getLongTaskMetrics({
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
      aggs: {
        longTaskSum: {
          percentiles: {
            field: LONG_TASK_SUM_FIELD,
            percents: [percentile],
            hdr: {
              number_of_significant_value_digits: 3,
            },
          },
        },
        longTaskCount: {
          percentiles: {
            field: LONG_TASK_COUNT_FIELD,
            percents: [percentile],
            hdr: {
              number_of_significant_value_digits: 3,
            },
          },
        },
        longTaskMax: {
          percentiles: {
            field: LONG_TASK_MAX_FIELD,
            percents: [percentile],
            hdr: {
              number_of_significant_value_digits: 3,
            },
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(params);

  const pkey = percentile.toFixed(1);

  const { longTaskSum, longTaskCount, longTaskMax } =
    response.aggregations ?? {};

  return {
    noOfLongTasks: longTaskCount?.values[pkey] ?? 0,
    sumOfLongTasks: longTaskSum?.values[pkey] ?? 0,
    longestLongTask: longTaskMax?.values[pkey] ?? 0,
  };
}
