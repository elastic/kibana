/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getRumLongTasksProjection,
  getRumPageLoadTransactionsProjection,
} from '../../projections/rum_page_load_transactions';
import { mergeProjection } from '../../projections/util/merge_projection';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';
import {
  SPAN_DURATION,
  TRANSACTION_ID,
} from '../../../common/elasticsearch_fieldnames';

export async function getLongTaskMetrics({
  setup,
  urlQuery,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  urlQuery?: string;
}) {
  const projection = getRumLongTasksProjection({
    setup,
    urlQuery,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
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
  const { transIds } = response.aggregations ?? {};

  const validTransactions: string[] = await filterPageLoadTransactions(
    setup,
    urlQuery,
    (transIds?.buckets ?? []).map((bucket) => bucket.key as string)
  );
  let noOfLongTasks = 0;
  let sumOfLongTasks = 0;
  let longestLongTask = 0;

  (transIds?.buckets ?? []).forEach((bucket) => {
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
  urlQuery?: string,
  transactionIds: string[]
) {
  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery,
  });

  const params = mergeProjection(projection, {
    body: {
      size: transactionIds.length,
      query: {
        bool: {
          must: [
            {
              terms: {
                [TRANSACTION_ID]: transactionIds,
              },
            },
          ],
          filter: [...projection.body.query.bool.filter],
        },
      },
      _source: [TRANSACTION_ID],
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(params);
  return response.hits.hits.map((hit) => (hit._source as any).transaction.id)!;
}
