/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { rangeFilter } from '../../../common/utils/range_filter';
import { Coordinates } from '../../../../observability/public';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import {
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../helpers/aggregated_transactions/get_use_aggregated_transaction';

export async function getTransactionCoordinates({
  setup,
  bucketSize,
  useAggregatedTransactions,
}: {
  setup: Setup & SetupTimeRange;
  bucketSize: string;
  useAggregatedTransactions: boolean;
}): Promise<Coordinates[]> {
  const { apmEventClient, start, end } = setup;

  const { aggregations } = await apmEventClient.search({
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(useAggregatedTransactions),
      ],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [{ range: rangeFilter(start, end) }],
        },
      },
      aggs: {
        distribution: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: bucketSize,
            min_doc_count: 0,
          },
          aggs: {
            count: {
              value_count: {
                field: getTransactionDurationFieldForAggregatedTransactions(
                  useAggregatedTransactions
                ),
              },
            },
          },
        },
      },
    },
  });

  const deltaAsMinutes = (end - start) / 1000 / 60;

  return (
    aggregations?.distribution.buckets.map((bucket) => ({
      x: bucket.key,
      y: bucket.count.value / deltaAsMinutes,
    })) || []
  );
}
