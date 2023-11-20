/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { estypes } from '@elastic/elasticsearch';
import { AggregationResultOfMap } from '@kbn/es-types';
import { ApmDocumentType } from '../../../../common/document_type';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  SERVICE_OVERFLOW_COUNT,
  TRANSACTION_DURATION_HISTOGRAM,
  TRANSACTION_DURATION_SUMMARY,
  TRANSACTION_DURATION,
} from '../../../../common/es_fields/apm';
import { RollupInterval } from '../../../../common/rollup';
import { ServiceGroup } from '../../../../common/service_groups';
import { isDefaultTransactionType } from '../../../../common/transaction_types';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { calculateThroughputWithRange } from '../../../lib/helpers/calculate_throughput';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import {
  getDurationLegacyFilter,
  getDurationSummaryFilter,
  isSummaryFieldSupportedByDocType,
} from '../../../lib/helpers/transactions';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../../lib/helpers/transaction_error_rate';
import { maybe } from '../../../../common/utils/maybe';
import { serviceGroupWithOverflowQuery } from '../../../lib/service_group_query_with_overflow';

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
  useDurationSummary: boolean;
}

export interface ServiceTransactionStatsResponse {
  serviceStats: Array<{
    serviceName: string;
    transactionType?: string;
    environments: string[];
    agentName?: AgentName;
    latency?: number | null;
    transactionErrorRate?: number;
    throughput?: number;
  }>;
  serviceOverflowCount: number;
}

type DurationSummaryAggregation = ReturnType<
  typeof getConditionalDurationAggregation
>;
type DurationAggregation = ReturnType<typeof getDurationAggregation>;
type AvgLatencyAggregation = ReturnType<typeof getOutcomeAggregation> &
  (DurationSummaryAggregation | DurationAggregation);

interface SearchParams {
  documentType: ApmDocumentType;
  rollupInterval: RollupInterval;
  filters: estypes.QueryDslQueryContainer[];
  maxNumServices: number;
  randomSampler: RandomSampler;
  metrics: AvgLatencyAggregation;
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
  useDurationSummary,
}: AggregationParams): Promise<ServiceTransactionStatsResponse> {
  const summaryFieldSupportedByDocType =
    isSummaryFieldSupportedByDocType(documentType);
  const outcomes = getOutcomeAggregation(documentType);

  const baseParams: SearchParams = {
    documentType,
    rollupInterval,
    maxNumServices,
    randomSampler,
    filters: [
      ...rangeQuery(start, end),
      ...environmentQuery(environment),
      ...kqlQuery(kuery),
      ...serviceGroupWithOverflowQuery(serviceGroup),
    ],
    metrics: {
      ...(summaryFieldSupportedByDocType && !useDurationSummary
        ? // if useDurationSummary is false, we can try to check if it's supported by each individual service
          getConditionalDurationAggregation()
        : // if useDurationSummary is true, it means that transaction.duration.summary is fully supported
          getDurationAggregation(summaryFieldSupportedByDocType)),
      ...outcomes,
    },
  };

  const response = await apmEventClient.search(
    'get_service_transaction_stats',
    getSearchRequest(baseParams)
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
          latency: topTransactionTypeBucket
            ? getAvgDurationValue(topTransactionTypeBucket)
            : undefined,
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
      response.aggregations?.sample?.overflowCount?.value ?? 0,
  };
}

function isDurationSummary(
  outcome: any
): outcome is AggregationResultOfMap<DurationSummaryAggregation, {}> {
  const summaryAgg = outcome as AggregationResultOfMap<
    DurationSummaryAggregation,
    {}
  >;
  return !!summaryAgg.avg_duration_legacy && !!summaryAgg.avg_duration_summary;
}

function getAvgDurationValue(
  outcomeResponse: AggregationResultOfMap<AvgLatencyAggregation, {}>
) {
  if (isDurationSummary(outcomeResponse)) {
    return (
      outcomeResponse.avg_duration_summary.result.value ??
      outcomeResponse.avg_duration_legacy.result.value
    );
  }

  return outcomeResponse.avg_duration.value;
}

function getDurationAggregation(summaryFieldSupportedByDocType: boolean) {
  return {
    avg_duration: {
      avg: {
        field: summaryFieldSupportedByDocType
          ? TRANSACTION_DURATION_SUMMARY
          : TRANSACTION_DURATION,
      },
    },
  };
}

function getConditionalDurationAggregation() {
  return {
    avg_duration_summary: {
      filter: { ...getDurationSummaryFilter() },
      aggs: {
        result: {
          avg: {
            field: TRANSACTION_DURATION_SUMMARY,
          },
        },
      },
    },
    avg_duration_legacy: {
      filter: { ...getDurationLegacyFilter() },
      aggs: {
        result: {
          avg: {
            field: TRANSACTION_DURATION_HISTOGRAM,
          },
        },
      },
    },
  };
}

function getSearchRequest({
  documentType,
  rollupInterval,
  filters,
  maxNumServices,
  randomSampler,
  metrics,
}: SearchParams) {
  return {
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
          filter: filters,
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
  };
}
