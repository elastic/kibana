/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { SERVICE_NAME, SERVICE_ENVIRONMENT } from '../../../common/es_fields/apm';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

/**
 * This is used for getting *all* environments, and does not filter by range.
 * It's used in places where we get the list of all possible environments.
 */
export async function getAllEnvironments({
  includeMissing = false,
  searchAggregatedTransactions,
  serviceName,
  apmEventClient,
  size,
}: {
  includeMissing?: boolean;
  searchAggregatedTransactions: boolean;
  serviceName?: string;
  apmEventClient: APMEventClient;
  size: number;
}) {
  const operationName = serviceName
    ? 'get_all_environments_for_service'
    : 'get_all_environments_for_all_services';

  const params = {
    apm: {
      events: [
        getProcessorEventForTransactions(searchAggregatedTransactions),
        ProcessorEvent.error,
        ProcessorEvent.metric,
      ],
    },
    body: {
      // use timeout + min_doc_count to return as early as possible
      // if filter is not defined to prevent timeouts
      ...(!serviceName ? { timeout: '1ms' } : {}),
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [...termQuery(SERVICE_NAME, serviceName)],
        },
      },
      aggs: {
        environments: {
          terms: {
            field: SERVICE_ENVIRONMENT,
            size,
            ...(!serviceName ? { min_doc_count: 0 } : {}),
            missing: includeMissing ? ENVIRONMENT_NOT_DEFINED.value : undefined,
          },
        },
      },
    },
  };

  const resp = await apmEventClient.search(operationName, params);

  const environments =
    resp.aggregations?.environments.buckets.map((bucket) => bucket.key as string) || [];
  return environments;
}
