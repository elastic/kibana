/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-data-access-plugin/common';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

const MAX_SERVICE_NAMES = 500;

/**
 * Fetches the primary (most frequent) value of groupByField per service from APM data.
 * Used by the service map to group nodes by arbitrary APM fields (e.g. transaction.type, host.name).
 */
export async function getServiceMapGroupByValues({
  apmEventClient,
  searchAggregatedTransactions,
  serviceNames,
  groupByField,
  start,
  end,
  environment,
  kuery,
}: {
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  serviceNames: string[];
  groupByField: string;
  start: number;
  end: number;
  environment: string;
  kuery: string;
}): Promise<Record<string, string>> {
  if (serviceNames.length === 0 || !groupByField) {
    return {};
  }

  const namesToQuery = serviceNames.slice(0, MAX_SERVICE_NAMES);
  const processorEvent = getProcessorEventForTransactions(searchAggregatedTransactions);
  const shouldQueryMetrics = processorEvent === ProcessorEvent.metric;

  const params = {
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
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          ...environmentQuery(environment),
          ...termsQuery(SERVICE_NAME, ...namesToQuery),
          ...kqlQuery(kuery),
        ],
      },
    },
    aggs: {
      by_service: {
        terms: {
          field: SERVICE_NAME,
          size: namesToQuery.length,
          include: namesToQuery,
        },
        aggs: {
          group_value: {
            terms: {
              field: groupByField,
              size: 1,
              order: { _count: 'desc' as const },
            },
          },
        },
      },
    },
  };

  const response = await apmEventClient.search(
    'get_service_map_group_by_values',
    params as Parameters<APMEventClient['search']>[1]
  );

  const buckets = response.aggregations?.by_service?.buckets ?? [];
  const result: Record<string, string> = {};

  for (const bucket of buckets) {
    const serviceName = bucket.key as string;
    const topBucket = bucket.group_value?.buckets?.[0];
    if (topBucket != null) {
      const value = topBucket.key_as_string ?? String(topBucket.key);
      result[serviceName] = value;
    }
  }

  return result;
}
