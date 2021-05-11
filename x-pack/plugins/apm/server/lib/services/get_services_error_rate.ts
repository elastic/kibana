/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFiniteNumber } from '../../../common/utils/is_finite_number';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { environmentQuery, rangeQuery } from '../../utils/queries';
import { withApmSpan } from '../../utils/with_apm_span';
import { getProcessorEventForAggregatedTransactions } from '../helpers/aggregated_transactions';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import {
  calculateTransactionErrorPercentage,
  getOutcomeAggregation,
} from '../helpers/transaction_error_rate';

export async function getServicesErrorRate({
  searchAggregatedTransactions,
  environment,
  transactionType,
  setup,
}: {
  searchAggregatedTransactions: boolean;
  environment?: string;
  transactionType?: string;
  setup: Setup & SetupTimeRange;
}) {
  return withApmSpan('get_services_error_rate', async () => {
    const { start, end, apmEventClient } = setup;

    const transactionTypefilter = transactionType
      ? [{ term: { [TRANSACTION_TYPE]: transactionType } }]
      : [];

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
              ...rangeQuery(start, end),
              ...transactionTypefilter,
              ...environmentQuery(environment),
            ],
          },
        },
        aggs: {
          serviceNames: {
            terms: {
              field: SERVICE_NAME,
              size: 10,
            },
            aggs: {
              outcomes: getOutcomeAggregation(),
            },
          },
        },
      },
    };

    const response = await apmEventClient.search(params);

    if (response.hits.total.value === 0) {
      return [];
    }

    return (
      response.aggregations?.serviceNames.buckets
        .map(({ key: serviceName, outcomes }) => {
          const errorRate = calculateTransactionErrorPercentage(outcomes);
          return { serviceName, errorRate };
        })
        .filter(({ errorRate }) => isFiniteNumber(errorRate)) || []
    );
  });
}
