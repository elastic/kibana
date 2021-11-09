/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '../../../../observability/server';
import {
  EVENT_OUTCOME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
} from '../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../common/event_outcome';
import { ProcessorEvent } from '../../../common/processor_event';
import { environmentQuery } from '../../../common/utils/environment_query';
import { withApmSpan } from '../../utils/with_apm_span';
import { calculateThroughput } from '../helpers/calculate_throughput';
import { Setup } from '../helpers/setup_request';

interface Options {
  setup: Setup;
  environment: string;
  backendName: string;
  start: number;
  end: number;
}

export function getServiceMapBackendNodeInfo({
  environment,
  backendName,
  setup,
  start,
  end,
}: Options) {
  return withApmSpan('get_service_map_backend_node_stats', async () => {
    const { apmEventClient } = setup;

    const response = await apmEventClient.search(
      'get_service_map_backend_node_stats',
      {
        apm: {
          events: [ProcessorEvent.metric],
        },
        body: {
          size: 0,
          query: {
            bool: {
              filter: [
                { term: { [SPAN_DESTINATION_SERVICE_RESOURCE]: backendName } },
                ...rangeQuery(start, end),
                ...environmentQuery(environment),
              ],
            },
          },
          aggs: {
            latency_sum: {
              sum: {
                field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
              },
            },
            count: {
              sum: {
                field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
              },
            },
            [EVENT_OUTCOME]: {
              terms: { field: EVENT_OUTCOME, include: [EventOutcome.failure] },
            },
          },
        },
      }
    );

    const count = response.aggregations?.count.value ?? 0;
    const errorCount =
      response.aggregations?.[EVENT_OUTCOME].buckets[0]?.doc_count ?? 0;
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
