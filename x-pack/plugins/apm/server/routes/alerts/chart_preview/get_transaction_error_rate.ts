/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '../../../../../observability/server';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { AlertParams } from '../route';
import {
  getSearchAggregatedTransactions,
  getDocumentTypeFilterForTransactions,
  getProcessorEventForTransactions,
} from '../../../lib/helpers/transactions';
import { Setup } from '../../../lib/helpers/setup_request';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../../lib/helpers/transaction_error_rate';

export async function getTransactionErrorRateChartPreview({
  setup,
  alertParams,
}: {
  setup: Setup;
  alertParams: AlertParams;
}) {
  const { apmEventClient } = setup;
  const { serviceName, environment, transactionType, interval, start, end } =
    alertParams;

  const searchAggregatedTransactions = await getSearchAggregatedTransactions({
    ...setup,
    kuery: '',
    start,
    end,
  });

  const outcomes = getOutcomeAggregation();

  const params = {
    apm: {
      events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...termQuery(TRANSACTION_TYPE, transactionType),
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...getDocumentTypeFilterForTransactions(
              searchAggregatedTransactions
            ),
          ],
        },
      },
      aggs: {
        outcomes,
        timeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: interval,
            extended_bounds: {
              min: start,
              max: end,
            },
          },
          aggs: { outcomes },
        },
      },
    },
  };

  const resp = await apmEventClient.search(
    'get_transaction_error_rate_chart_preview',
    params
  );

  if (!resp.aggregations) {
    return [];
  }

  return resp.aggregations.timeseries.buckets.map((bucket) => {
    return {
      x: bucket.key,
      y: calculateFailedTransactionRate(bucket.outcomes),
    };
  });
}
