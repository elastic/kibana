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

  // Shared filter + agg shape across the primary query and the fallback retry.
  // Only the data source (`apm` field) differs between the two calls.
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

  // Fallback for the rollup/kuery field-mismatch (#268612 follow-up).
  //
  // When `searchAggregatedTransactions` is true we query `ServiceTransactionMetric`,
  // a per-(service, env, transaction.type) rollup that intentionally does NOT carry
  // `transaction.name`. If the caller's kuery references `transaction.name` (typical
  // for the alert-details preview seeded from the alert's source fields, and
  // possible whenever a user types `transaction.name: "..."` in the standalone map's
  // KQL bar), the rollup query matches zero docs and the map renders the empty
  // state — even though raw transaction events would have matched.
  //
  // Adding `transaction.name` to ServiceTransactionMetric would explode its
  // cardinality (per-endpoint instead of per-service) and defeat the whole point
  // of having two rollup families. Instead, when the cheap rollup comes back empty
  // AND we had a kuery in the first place, retry once against `TransactionMetric`
  // (per-transaction-group rollup at 1m), which carries every field the user can
  // filter on. It's still a rollup — cheaper than raw events — and the second
  // roundtrip only fires when the first query truly returned nothing, so the
  // steady-state cost on populated clusters is zero.
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
