/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SERVICE_OVERFLOW_COUNT,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../../common/transaction_types';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import {
  getDocumentTypeFilterForTransactions,
  getDurationFieldForTransactions,
  getProcessorEventForTransactions,
} from '../../../lib/helpers/transactions';
import { calculateThroughputWithRange } from '../../../lib/helpers/calculate_throughput';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../../lib/helpers/transaction_error_rate';
import { serviceGroupQuery } from '../../../lib/service_group_query';
import { ServiceGroup } from '../../../../common/service_groups';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

interface AggregationParams {
  environment: string;
  kuery: string;
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  maxNumServices: number;
  start: number;
  end: number;
  serviceGroup: ServiceGroup | null;
  randomSampler: RandomSampler;
}

export async function getServiceStats({
  environment,
  kuery,
  apmEventClient,
  searchAggregatedTransactions,
  maxNumServices,
  start,
  end,
  serviceGroup,
  randomSampler,
}: AggregationParams) {
  const outcomes = getOutcomeAggregation();

  const metrics = {
    avg_duration: {
      avg: {
        field: getDurationFieldForTransactions(searchAggregatedTransactions),
      },
    },
    outcomes,
  };

  const response = await apmEventClient.search('get_service_stats', {
    apm: {
      events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...getDocumentTypeFilterForTransactions(
              searchAggregatedTransactions
            ),
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...serviceGroupQuery(serviceGroup),
          ],
        },
      },
      aggs: {
        sample: {
          random_sampler: randomSampler,
          aggs: {
            overflowCount: {
              sum: {
                field: SERVICE_OVERFLOW_COUNT,
              },
            },
            services: {
              terms: {
                field: SERVICE_NAME,
                size: maxNumServices,
              },
              aggs: {
                transactionType: {
                  terms: {
                    field: TRANSACTION_TYPE,
                  },
                  aggs: {
                    ...metrics,
                    environments: {
                      terms: {
                        field: SERVICE_ENVIRONMENT,
                      },
                    },
                    sample: {
                      top_metrics: {
                        metrics: [{ field: AGENT_NAME } as const],
                        sort: {
                          '@timestamp': 'desc' as const,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return {
    serviceStats:
      response.aggregations?.sample.services.buckets.map((bucket) => {
        const topTransactionTypeBucket =
          bucket.transactionType.buckets.find(
            ({ key }) =>
              key === TRANSACTION_REQUEST || key === TRANSACTION_PAGE_LOAD
          ) ?? bucket.transactionType.buckets[0];

        return {
          serviceName: bucket.key as string,
          transactionType: topTransactionTypeBucket.key as string,
          environments: topTransactionTypeBucket.environments.buckets.map(
            (environmentBucket) => environmentBucket.key as string
          ),
          agentName: topTransactionTypeBucket.sample.top[0].metrics[
            AGENT_NAME
          ] as AgentName,
          latency: topTransactionTypeBucket.avg_duration.value,
          transactionErrorRate: calculateFailedTransactionRate(
            topTransactionTypeBucket.outcomes
          ),
          throughput: calculateThroughputWithRange({
            start,
            end,
            value: topTransactionTypeBucket.doc_count,
          }),
        };
      }) ?? [],
    serviceOverflowCount:
      response.aggregations?.sample?.overflowCount.value || 0,
  };
}
