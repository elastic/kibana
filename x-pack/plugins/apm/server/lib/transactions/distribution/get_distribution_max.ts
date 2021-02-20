/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { environmentQuery, rangeQuery } from '../../../../common/utils/queries';
import { withApmSpan } from '../../../utils/with_apm_span';

export async function getDistributionMax({
  environment,
  serviceName,
  transactionName,
  transactionType,
  setup,
  searchAggregatedTransactions,
}: {
  environment?: string;
  serviceName: string;
  transactionName: string;
  transactionType: string;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
}) {
  return withApmSpan('get_latency_distribution_max', async () => {
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
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
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
  });
}
