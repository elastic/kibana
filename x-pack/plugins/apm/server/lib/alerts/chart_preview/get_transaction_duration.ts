/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { rangeQuery } from '../../../../../observability/server';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { AlertParams } from '../../../routes/alerts/chart_preview';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
  getSearchAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../../helpers/aggregated_transactions';
import { Setup } from '../../helpers/setup_request';

export async function getTransactionDurationChartPreview({
  alertParams,
  setup,
}: {
  alertParams: AlertParams;
  setup: Setup;
}) {
  const { apmEventClient } = setup;
  const {
    aggregationType,
    environment,
    serviceName,
    transactionType,
    interval,
    start,
    end,
  } = alertParams;
  const searchAggregatedTransactions = await getSearchAggregatedTransactions({
    ...setup,
    kuery: '',
  });

  const query = {
    bool: {
      filter: [
        ...(serviceName ? [{ term: { [SERVICE_NAME]: serviceName } }] : []),
        ...(transactionType
          ? [{ term: { [TRANSACTION_TYPE]: transactionType } }]
          : []),
        ...rangeQuery(start, end),
        ...environmentQuery(environment),
        ...getDocumentTypeFilterForAggregatedTransactions(
          searchAggregatedTransactions
        ),
      ] as QueryDslQueryContainer[],
    },
  };

  const transactionDurationField =
    getTransactionDurationFieldForAggregatedTransactions(
      searchAggregatedTransactions
    );

  const aggs = {
    timeseries: {
      date_histogram: {
        field: '@timestamp',
        fixed_interval: interval,
        min_doc_count: 0,
        extended_bounds: {
          min: start,
          max: end,
        },
      },
      aggs: {
        agg:
          aggregationType === 'avg'
            ? { avg: { field: transactionDurationField } }
            : {
                percentiles: {
                  field: transactionDurationField,
                  percents: [aggregationType === '95th' ? 95 : 99],
                },
              },
      },
    },
  };
  const params = {
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(
          searchAggregatedTransactions
        ),
      ],
    },
    body: { size: 0, query, aggs },
  };
  const resp = await apmEventClient.search(
    'get_transaction_duration_chart_preview',
    params
  );

  if (!resp.aggregations) {
    return [];
  }

  return resp.aggregations.timeseries.buckets.map((bucket) => {
    const percentilesKey = aggregationType === '95th' ? '95.0' : '99.0';
    const x = bucket.key;
    const y =
      aggregationType === 'avg'
        ? (bucket.agg as { value: number | null }).value
        : (bucket.agg as { values: Record<string, number | null> }).values[
            percentilesKey
          ];

    return { x, y };
  });
}
