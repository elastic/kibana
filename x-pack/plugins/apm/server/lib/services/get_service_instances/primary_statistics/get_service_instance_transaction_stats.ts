/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceInstancePrimaryStatisticsParams } from '.';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../../../common/event_outcome';
import { SERVICE_NODE_NAME_MISSING } from '../../../../../common/service_nodes';
import {
  environmentQuery,
  kqlQuery,
  rangeQuery,
} from '../../../../../server/utils/queries';
import { withApmSpan } from '../../../../utils/with_apm_span';
import {
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../../../helpers/aggregated_transactions';
import { calculateThroughput } from '../../../helpers/calculate_throughput';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../../../helpers/latency_aggregation_type';

export async function getServiceInstanceTransactionStats({
  environment,
  kuery,
  latencyAggregationType,
  setup,
  transactionType,
  serviceName,
  size,
  searchAggregatedTransactions,
}: ServiceInstancePrimaryStatisticsParams) {
  return withApmSpan('get_service_instance_transaction_stats', async () => {
    const { apmEventClient, start, end } = setup;

    const field = getTransactionDurationFieldForAggregatedTransactions(
      searchAggregatedTransactions
    );

    const subAggs = {
      ...getLatencyAggregation(latencyAggregationType, field),
      failures: {
        filter: {
          term: {
            [EVENT_OUTCOME]: EventOutcome.failure,
          },
        },
      },
    };

    const response = await apmEventClient.search({
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
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
            ],
          },
        },
        aggs: {
          [SERVICE_NODE_NAME]: {
            terms: {
              field: SERVICE_NODE_NAME,
              missing: SERVICE_NODE_NAME_MISSING,
              size,
            },
            aggs: subAggs,
          },
        },
      },
    });

    return (
      response.aggregations?.[SERVICE_NODE_NAME].buckets.map(
        (serviceNodeBucket) => {
          const {
            doc_count: count,
            latency,
            key,
            failures,
          } = serviceNodeBucket;

          return {
            serviceNodeName: String(key),
            errorRate: failures.doc_count / count,
            throughput: calculateThroughput({ start, end, value: count }),
            latency: getLatencyValue({
              aggregation: latency,
              latencyAggregationType,
            }),
          };
        }
      ) ?? []
    );
  });
}
