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

export async function getPageLoadTransactionIds({
  setup,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const projection = getRumPageLoadTransactionsProjection({
    setup,
  });

  let result: string[] = [];

  let afterKey: any;

  do {
    const params = mergeProjection(projection, {
      body: {
        size: 0,
        query: {
          bool: projection.body.query.bool,
        },
        aggs: {
          transIds: {
            composite: {
              sources: [
                {
                  transactionId: {
                    terms: {
                      field: TRANSACTION_ID,
                    },
                  },
                },
              ],
              ...(afterKey ? { after: afterKey } : {}),
              size: 10000,
            },
          },
        },
      },
    });

    const { apmEventClient } = setup;

    const response = await apmEventClient.search(params);
    const { transIds } = response.aggregations ?? {};

    result = result.concat(
      (transIds?.buckets ?? []).map(({ key }) => (key as unknown) as string)
    );

    afterKey = transIds?.after_key;
  } while (afterKey !== undefined);

  return result;
}

export async function getLongTaskMetrics(
  setup: Setup & SetupTimeRange & SetupUIFilters
) {
  const projection = getRumLongTasksProjection({
    setup,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          filter: [
            ...projection.body.query.bool.filter,
            {
              terms: {
                [TRANSACTION_ID]: getPageLoadTransactionIds({ setup }),
              },
            },
          ],
        },
      },
      aggs: {
        longestLongTask: {
          max: {
            field: SPAN_DURATION,
          },
        },
        sumOfLongTasks: {
          sum: {
            field: SPAN_DURATION,
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(params);

  const { sumOfLongTasks, longestLongTask } = response.aggregations ?? {};

  return {
    noOfLongTasks: response.hits.total.value,
    sumOfLongTasks: sumOfLongTasks?.value ?? 0,
    longestLongTask: longestLongTask?.value ?? 0,
  };
}
