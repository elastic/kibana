/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '../../../common/utils/queries';
import { Coordinates } from '../../../../observability/typings/common';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { getProcessorEventForAggregatedTransactions } from '../helpers/aggregated_transactions';
import { calculateThroughput } from '../helpers/calculate_throughput';
import { withApmSpan } from '../../utils/with_apm_span';

export function getTransactionCoordinates({
  setup,
  bucketSize,
  searchAggregatedTransactions,
}: {
  setup: Setup & SetupTimeRange;
  bucketSize: string;
  searchAggregatedTransactions: boolean;
}): Promise<Coordinates[]> {
  return withApmSpan(
    'observability_overview_get_transaction_distribution',
    async () => {
      const { apmEventClient, start, end } = setup;

      const { aggregations } = await apmEventClient.search({
        apm: {
          events: [
            getProcessorEventForAggregatedTransactions(
              searchAggregatedTransactions
            ),
          ],
        },
        body: {
          size: 0,
          query: {
            bool: {
              filter: rangeQuery(start, end),
            },
          },
          aggs: {
            distribution: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: bucketSize,
                min_doc_count: 0,
              },
            },
          },
        },
      });

      return (
        aggregations?.distribution.buckets.map((bucket) => ({
          x: bucket.key,
          y: calculateThroughput({ start, end, value: bucket.doc_count }),
        })) || []
      );
    }
  );
}
