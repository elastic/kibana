/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ApmDocumentType } from '../../../../common/document_type';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  SERVICE_OVERFLOW_COUNT,
} from '../../../../common/es_fields/apm';
import { RollupInterval } from '../../../../common/rollup';
import { ServiceGroup } from '../../../../common/service_groups';
import { isDefaultTransactionType } from '../../../../common/transaction_types';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { calculateThroughputWithRange } from '../../../lib/helpers/calculate_throughput';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { getDurationFieldForTransactions } from '../../../lib/helpers/transactions';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../../lib/helpers/transaction_error_rate';
import { serviceGroupQuery } from '../../../lib/service_group_query';
import { maybe } from '../../../../common/utils/maybe';

interface AggregationParams {
  environment: string;
  kuery: string;
  apmEventClient: APMEventClient;
  maxNumServices: number;
  start: number;
  end: number;
  serviceGroup: ServiceGroup | null;
  randomSampler: RandomSampler;
  documentType:
    | ApmDocumentType.ServiceTransactionMetric
    | ApmDocumentType.TransactionMetric
    | ApmDocumentType.TransactionEvent;
  rollupInterval: RollupInterval;
}

export async function getServiceTransactionStats({
  environment,
  kuery,
  apmEventClient,
  maxNumServices,
  start,
  end,
  serviceGroup,
  randomSampler,
  documentType,
  rollupInterval,
}: AggregationParams) {
  const outcomes = getOutcomeAggregation(documentType);

  const metrics = {
    avg_duration: {
      avg: {
        field: getDurationFieldForTransactions(documentType),
      },
    },
    ...outcomes,
  };

  const response = await apmEventClient.search(
    'get_service_transaction_stats',
    {
      apm: {
        sources: [
          {
            documentType,
            rollupInterval,
          },
        ],
      },
      body: {
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
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
    }
  );

  return {
    serviceStats:
      response.aggregations?.sample.services.buckets.map((bucket) => {
        const topTransactionTypeBucket = maybe(
          bucket.transactionType.buckets.find(({ key }) =>
            isDefaultTransactionType(key as string)
          ) ?? bucket.transactionType.buckets[0]
        );

        return {
          serviceName: bucket.key as string,
          transactionType: topTransactionTypeBucket?.key as string | undefined,
          environments:
            topTransactionTypeBucket?.environments.buckets.map(
              (environmentBucket) => environmentBucket.key as string
            ) ?? [],
          agentName: topTransactionTypeBucket?.sample.top[0].metrics[
            AGENT_NAME
          ] as AgentName | undefined,
          latency: topTransactionTypeBucket?.avg_duration.value,
          transactionErrorRate: topTransactionTypeBucket
            ? calculateFailedTransactionRate(topTransactionTypeBucket)
            : undefined,
          throughput: topTransactionTypeBucket
            ? calculateThroughputWithRange({
                start,
                end,
                value: topTransactionTypeBucket?.doc_count,
              })
            : undefined,
        };
      }) ?? [],
    serviceOverflowCount:
      response.aggregations?.sample?.overflowCount.value || 0,
  };
}
