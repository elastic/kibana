/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mean } from 'lodash';
import {
  HTTP_RESPONSE_STATUS_CODE,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { rangeFilter } from '../../../common/utils/range_filter';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';
import { getBucketSize } from '../helpers/get_bucket_size';

export async function getErrorRate({
  serviceName,
  transactionType,
  transactionName,
  setup,
}: {
  serviceName: string;
  transactionType?: string;
  transactionName?: string;
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const { start, end, uiFiltersES, apmEventClient } = setup;

  const transactionNamefilter = transactionName
    ? [{ term: { [TRANSACTION_NAME]: transactionName } }]
    : [];
  const transactionTypefilter = transactionType
    ? [{ term: { [TRANSACTION_TYPE]: transactionType } }]
    : [];

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { range: rangeFilter(start, end) },
    { exists: { field: HTTP_RESPONSE_STATUS_CODE } },
    ...transactionNamefilter,
    ...transactionTypefilter,
    ...uiFiltersES,
  ];

  const params = {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    body: {
      size: 0,
      query: { bool: { filter } },
      aggs: {
        total_transactions: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: getBucketSize(start, end, 'auto').intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end },
          },
          aggs: {
            erroneous_transactions: {
              filter: { range: { [HTTP_RESPONSE_STATUS_CODE]: { gte: 400 } } },
            },
          },
        },
      },
    },
  };

  const resp = await apmEventClient.search(params);

  const noHits = resp.hits.total.value === 0;

  const erroneousTransactionsRate =
    resp.aggregations?.total_transactions.buckets.map(
      ({
        key,
        doc_count: totalTransactions,
        erroneous_transactions: erroneousTransactions,
      }) => {
        const errornousTransactionsCount =
          // @ts-expect-error
          erroneousTransactions.doc_count;
        return {
          x: key,
          y: errornousTransactionsCount / totalTransactions,
        };
      }
    ) || [];

  const average = mean(
    erroneousTransactionsRate
      .map((errorRate) => errorRate.y)
      .filter((y) => isFinite(y))
  );

  return { noHits, erroneousTransactionsRate, average };
}
