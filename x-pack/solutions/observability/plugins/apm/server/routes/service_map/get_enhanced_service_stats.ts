/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import { getAgentName } from '@kbn/elastic-agent-utils';
import type { RollupInterval } from '@kbn/apm-data-access-plugin/common';
import { ApmDocumentType } from '@kbn/apm-data-access-plugin/common';
import {
  calculateFailedTransactionRate,
  calculateThroughputWithRange,
  getDurationFieldForTransactions,
  getOutcomeAggregation,
} from '@kbn/apm-data-access-plugin/server/utils';
import type { ServicesResponse } from '../../../common/service_map/types';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TELEMETRY_SDK_LANGUAGE,
  TELEMETRY_SDK_NAME,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import { defaultTransactionTypes } from '../../../common/transaction_types';
import { environmentQuery } from '../../../common/utils/environment_query';
import { isFiniteNumber } from '../../../common/utils/is_finite_number';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import type { IEnvOptions } from './get_service_map';
import { extractEsQueryFilters } from './extract_es_query_filters';

/** The source the client picked, the same one the service inventory uses. */
export interface ServiceStatsSource {
  documentType:
    | ApmDocumentType.ServiceTransactionMetric
    | ApmDocumentType.TransactionMetric
    | ApmDocumentType.TransactionEvent;
  rollupInterval: RollupInterval;
  useDurationSummary: boolean;
}

export type EnhancedServiceStatsOptions = IEnvOptions & {
  maxNumberOfServices: number;
  source: ServiceStatsSource;
};

/**
 * Service map services with the stats of their main transaction type: the busiest default type,
 * otherwise the busiest type.
 */
export async function getEnhancedServiceStats({
  environment,
  apmEventClient,
  source: { documentType, rollupInterval, useDurationSummary },
  start,
  end,
  maxNumberOfServices,
  serviceGroupKuery,
  serviceName,
  kuery,
  esQuery,
}: EnhancedServiceStatsOptions): Promise<ServicesResponse[]> {
  const { filter: esQueryFilters, mustNot: esQueryMustNot } = extractEsQueryFilters(esQuery);

  const searchServices = (
    operationName: string,
    searchDocumentType: ServiceStatsSource['documentType']
  ) => {
    const typeStats = {
      latency: {
        avg: { field: getDurationFieldForTransactions(searchDocumentType, useDurationSummary) },
      },
      ...getOutcomeAggregation(searchDocumentType),
    };

    return apmEventClient.search(operationName, {
      apm: { sources: [{ documentType: searchDocumentType, rollupInterval }] },
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...termsQuery(SERVICE_NAME, serviceName),
            ...kqlQuery(serviceGroupKuery),
            ...kqlQuery(kuery),
            ...esQueryFilters,
          ],
          ...(esQueryMustNot.length > 0 ? { must_not: esQueryMustNot } : {}),
        },
      },
      aggs: {
        services: {
          terms: { field: SERVICE_NAME, size: maxNumberOfServices },
          aggs: {
            // `top_metrics` adds no buckets, unlike a terms aggregation per field
            agent: {
              top_metrics: {
                metrics: [
                  { field: AGENT_NAME },
                  { field: TELEMETRY_SDK_LANGUAGE },
                  { field: TELEMETRY_SDK_NAME },
                ],
                sort: { '@timestamp': 'desc' as const },
              },
            },
            default_type: {
              terms: { field: TRANSACTION_TYPE, include: defaultTransactionTypes, size: 1 },
              aggs: typeStats,
            },
            top_type: {
              terms: { field: TRANSACTION_TYPE, size: 1 },
              aggs: typeStats,
            },
          },
        },
      },
    });
  };

  const primaryResponse = await searchServices(
    'get_enhanced_service_stats_for_service_map',
    documentType
  );
  let buckets = primaryResponse.aggregations?.services.buckets ?? [];

  // `ServiceTransactionMetric` doesn't carry `transaction.name`; retry against the
  // per-transaction-group `TransactionMetric` at the same interval when a filter may reference it.
  const hasKueryFilter = Boolean(kuery && kuery.trim() !== '');
  const hasEsQueryFilter = esQueryFilters.length > 0;
  const shouldRetry =
    documentType === ApmDocumentType.ServiceTransactionMetric &&
    buckets.length === 0 &&
    (hasKueryFilter || hasEsQueryFilter);

  if (shouldRetry) {
    const fallbackResponse = await searchServices(
      'get_enhanced_service_stats_for_service_map_fallback',
      ApmDocumentType.TransactionMetric
    );
    buckets = fallbackResponse.aggregations?.services.buckets ?? [];
  }

  return buckets.map((bucket) => {
    const agentMetrics = bucket.agent.top[0]?.metrics;
    const mainTypeBucket = bucket.default_type.buckets[0] ?? bucket.top_type.buckets[0];
    // NaN when none of the main type's transactions has a known outcome
    const failedTransactionRate = mainTypeBucket
      ? calculateFailedTransactionRate(mainTypeBucket)
      : undefined;

    return {
      [SERVICE_NAME]: bucket.key as string,
      [AGENT_NAME]:
        getAgentName(
          (agentMetrics?.[AGENT_NAME] as string | null | undefined) ?? null,
          (agentMetrics?.[TELEMETRY_SDK_LANGUAGE] as string | null | undefined) ?? null,
          (agentMetrics?.[TELEMETRY_SDK_NAME] as string | null | undefined) ?? null
        ) || '',
      [SERVICE_ENVIRONMENT]: environment === ENVIRONMENT_ALL.value ? null : environment,
      ...(mainTypeBucket
        ? {
            stats: {
              transactionType: mainTypeBucket.key as string,
              throughput: calculateThroughputWithRange({
                start,
                end,
                value: mainTypeBucket.doc_count,
              }),
              failedTransactionRate: isFiniteNumber(failedTransactionRate)
                ? failedTransactionRate
                : null,
              latency: mainTypeBucket.latency.value,
              requestCount: mainTypeBucket.doc_count,
            },
          }
        : {}),
    };
  });
}
