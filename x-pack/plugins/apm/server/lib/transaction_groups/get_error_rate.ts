/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mean } from 'lodash';
import {
  PROCESSOR_EVENT,
  HTTP_RESPONSE_STATUS_CODE,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { rangeFilter } from '../../../common/utils/range_filter';
import { getMetricsDateHistogramParams } from '../helpers/metrics';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';

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
  const { start, end, uiFiltersES, client, indices } = setup;

  const transactionNamefilter = transactionName
    ? [{ term: { [TRANSACTION_NAME]: transactionName } }]
    : [];
  const transactionTypefilter = transactionType
    ? [{ term: { [TRANSACTION_TYPE]: transactionType } }]
    : [];

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
    { range: rangeFilter(start, end) },
    { exists: { field: HTTP_RESPONSE_STATUS_CODE } },
    ...transactionNamefilter,
    ...transactionTypefilter,
    ...uiFiltersES,
  ];

  const params = {
    index: indices['apm_oss.transactionIndices'],
    body: {
      size: 0,
      query: { bool: { filter } },
      aggs: {
        total_transactions: {
          date_histogram: getMetricsDateHistogramParams(start, end),
          aggs: {
            erroneous_transactions: {
              filter: { range: { [HTTP_RESPONSE_STATUS_CODE]: { gte: 400 } } },
            },
          },
        },
      },
    },
  };

  const resp = await client.search(params);

  const noHits = resp.hits.total.value === 0;

  const erroneousTransactionsRate =
    resp.aggregations?.total_transactions.buckets.map(
      ({ key, doc_count: totalTransactions, erroneous_transactions }) => {
        const errornousTransactionsCount =
          // @ts-ignore
          erroneous_transactions.doc_count;
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
