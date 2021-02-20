/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Coordinate } from '../../../typings/timeseries';

import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../common/event_outcome';
import { environmentQuery, rangeQuery } from '../../../common/utils/queries';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
} from '../helpers/aggregated_transactions';
import { getBucketSize } from '../helpers/get_bucket_size';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import {
  calculateTransactionErrorPercentage,
  getOutcomeAggregation,
  getTransactionErrorRateTimeSeries,
} from '../helpers/transaction_error_rate';
import { withApmSpan } from '../../utils/with_apm_span';

export async function getErrorRate({
  environment,
  serviceName,
  transactionType,
  transactionName,
  setup,
  searchAggregatedTransactions,
}: {
  environment?: string;
  serviceName: string;
  transactionType?: string;
  transactionName?: string;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
}): Promise<{
  noHits: boolean;
  transactionErrorRate: Coordinate[];
  average: number | null;
}> {
  return withApmSpan('get_transaction_group_error_rate', async () => {
    const { start, end, esFilter, apmEventClient } = setup;

    const transactionNamefilter = transactionName
      ? [{ term: { [TRANSACTION_NAME]: transactionName } }]
      : [];
    const transactionTypefilter = transactionType
      ? [{ term: { [TRANSACTION_TYPE]: transactionType } }]
      : [];

    const filter = [
      { term: { [SERVICE_NAME]: serviceName } },
      {
        terms: {
          [EVENT_OUTCOME]: [EventOutcome.failure, EventOutcome.success],
        },
      },
      ...transactionNamefilter,
      ...transactionTypefilter,
      ...getDocumentTypeFilterForAggregatedTransactions(
        searchAggregatedTransactions
      ),
      ...rangeQuery(start, end),
      ...environmentQuery(environment),
      ...esFilter,
    ];

    const outcomes = getOutcomeAggregation();

    const params = {
      apm: {
        events: [
          getProcessorEventForAggregatedTransactions(
            searchAggregatedTransactions
          ),
        ],
      },
      body: {
        size: 0,
        query: { bool: { filter } },
        aggs: {
          outcomes,
          timeseries: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: getBucketSize({ start, end }).intervalString,
              min_doc_count: 0,
              extended_bounds: { min: start, max: end },
            },
            aggs: {
              outcomes,
            },
          },
        },
      },
    };

    const resp = await apmEventClient.search(params);

    const noHits = resp.hits.total.value === 0;

    if (!resp.aggregations) {
      return { noHits, transactionErrorRate: [], average: null };
    }

    const transactionErrorRate = getTransactionErrorRateTimeSeries(
      resp.aggregations.timeseries.buckets
    );

    const average = calculateTransactionErrorPercentage(
      resp.aggregations.outcomes
    );

    return { noHits, transactionErrorRate, average };
  });
}
