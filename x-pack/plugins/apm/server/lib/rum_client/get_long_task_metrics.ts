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
        transIds: {
          terms: {
            field: 'transaction.id',
            size: 1000,
          },
          aggs: {
            sumLongTask: {
              sum: {
                field: SPAN_DURATION,
              },
            },
            longestLongTask: {
              max: {
                field: SPAN_DURATION,
              },
            },
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(params);
  const { transIds } = response.aggregations!;

  const validTransactions: string[] = await filterPageLoadTransactions(
    setup,
    transIds.buckets.map((bucket) => bucket.key as string)
  );
  let noOfLongTasks = 0;
  let sumOfLongTasks = 0;
  let longestLongTask = 0;

  transIds.buckets.forEach((bucket) => {
    if (validTransactions.includes(bucket.key as string)) {
      noOfLongTasks += bucket.doc_count;
      sumOfLongTasks += bucket.sumLongTask.value ?? 0;
      if ((bucket.longestLongTask.value ?? 0) > longestLongTask) {
        longestLongTask = bucket.longestLongTask.value!;
      }
    }
  });
  return {
    noOfLongTasks,
    sumOfLongTasks,
    longestLongTask,
  };
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
      size: transactionIds.length,
      query: {
        bool: {
          must: [
            {
              terms: {
                'transaction.id': transactionIds,
              },
            },
          ],
          filter: [...projection.body.query.bool.filter],
        },
      },
      _source: ['transaction.id'],
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(params);
  return response.hits.hits.map((hit) => (hit._source as any).transaction.id)!;
}
