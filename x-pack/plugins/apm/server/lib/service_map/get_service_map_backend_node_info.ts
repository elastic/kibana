/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '../../../../observability/server';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
} from '../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../common/utils/environment_query';
import { withApmSpan } from '../../utils/with_apm_span';
import { getProcessorEventForAggregatedTransactions } from '../helpers/aggregated_transactions';
import { calculateThroughput } from '../helpers/calculate_throughput';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

interface Options {
  setup: Setup & SetupTimeRange;
  environment?: string;
  backendName: string;
  searchAggregatedTransactions: boolean;
  upstreamServices: string[];
}

export function getServiceMapBackendNodeInfo({
  environment,
  backendName,
  setup,
  searchAggregatedTransactions,
  upstreamServices,
}: Options) {
  return withApmSpan('get_service_map_backend_node_stats', async () => {
    const { apmEventClient, start, end } = setup;

    const response = await apmEventClient.search(
      'get_service_map_backend_node_stats',
      {
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
                { term: { [SPAN_DESTINATION_SERVICE_RESOURCE]: backendName } },
                { terms: { [SERVICE_NAME]: upstreamServices } },
                ...rangeQuery(start, end),
                ...environmentQuery(environment),
              ],
            },
          },
          aggs: {
            latency_sum: {
              sum: {
                field: 'span.destination.service.response_time.sum.us',
              },
            },
            count: {
              sum: {
                field: 'span.destination.service.response_time.count',
              },
            },
            'event.outcome': {
              terms: { field: 'event.outcome', include: ['failure'] },
            },
          },
        },
      }
    );

    const count = response.aggregations?.count.value ?? 0;
    const errorCount =
      response.aggregations?.['event.outcome'].buckets[0]?.doc_count ?? 0;
    const latencySum = response.aggregations?.latency_sum.value ?? 0;

    const avgErrorRate = errorCount / count;
    const avgTransactionDuration = latencySum / count;
    const avgRequestsPerMinute = calculateThroughput({
      start,
      end,
      value: count,
    });

    if (count === 0) {
      return {
        avgErrorRate: null,
        transactionStats: {
          avgRequestsPerMinute: null,
          avgTransactionDuration: null,
        },
      };
    }

    return {
      avgErrorRate,
      transactionStats: {
        avgRequestsPerMinute,
        avgTransactionDuration,
      },
    };
  });
}
