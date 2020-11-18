/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import {
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../../helpers/aggregated_transactions';

export async function getDistributionMax({
  serviceName,
  transactionName,
  transactionType,
  setup,
  searchAggregatedTransactions,
}: {
  serviceName: string;
  transactionName: string;
  transactionType: string;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
}) {
  const { start, end, esFilter, apmEventClient } = setup;

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
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [TRANSACTION_TYPE]: transactionType } },
            { term: { [TRANSACTION_NAME]: transactionName } },
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis',
                },
              },
            },
            ...esFilter,
          ],
        },
      },
      aggs: {
        stats: {
          max: {
            field: getTransactionDurationFieldForAggregatedTransactions(
              searchAggregatedTransactions
            ),
          },
        },
      },
    },
  };

  const resp = await apmEventClient.search(params);
  return resp.aggregations?.stats.value ?? null;
}
