/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-data-access-plugin/common';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { ServicesResponse } from '../../../common/service_map/types';
import { AGENT_NAME, SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import type { IEnvOptions } from './get_service_map';

export async function getServiceStats({
  environment,
  apmEventClient,
  searchAggregatedTransactions,
  start,
  end,
  maxNumberOfServices,
  serviceGroupKuery,
  serviceName,
  kuery,
}: IEnvOptions & { maxNumberOfServices: number }): Promise<ServicesResponse[]> {
  const processorEvent = getProcessorEventForTransactions(searchAggregatedTransactions);
  const shouldQueryMetrics = processorEvent === ProcessorEvent.metric;

  const sharedRequestBody = {
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
        ],
      },
    },
    aggs: {
      services: {
        terms: {
          field: SERVICE_NAME,
          size: maxNumberOfServices,
        },
        aggs: {
          agent_name: {
            terms: {
              field: AGENT_NAME,
            },
          },
        },
      },
    },
  };

  const primaryResponse = await apmEventClient.search('get_service_stats_for_service_map', {
    apm: shouldQueryMetrics
      ? {
          sources: [
            {
              documentType: ApmDocumentType.ServiceTransactionMetric,
              rollupInterval: RollupInterval.OneMinute,
            },
          ],
        }
      : { events: [processorEvent] },
    ...sharedRequestBody,
  });

  let buckets = primaryResponse.aggregations?.services.buckets ?? [];

  // `ServiceTransactionMetric` doesn't carry `transaction.name`; retry against the
  // per-transaction-group `TransactionMetric` rollup when the kuery referenced it.
  const hasKueryFilter = Boolean(kuery && kuery.trim() !== '');
  const shouldRetry = shouldQueryMetrics && buckets.length === 0 && hasKueryFilter;

  if (shouldRetry) {
    const fallbackResponse = await apmEventClient.search(
      'get_service_stats_for_service_map_fallback',
      {
        apm: {
          sources: [
            {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.OneMinute,
            },
          ],
        },
        ...sharedRequestBody,
      }
    );
    buckets = fallbackResponse.aggregations?.services.buckets ?? [];
  }

  return buckets.map((bucket) => ({
    [SERVICE_NAME]: bucket.key as string,
    [AGENT_NAME]: (bucket.agent_name.buckets[0]?.key as string | undefined) || '',
    [SERVICE_ENVIRONMENT]: environment === ENVIRONMENT_ALL.value ? null : environment,
  }));
}
