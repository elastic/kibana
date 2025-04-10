/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../common/es_fields/apm';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import type { Environment } from '../../../common/environment_rt';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { hasUnsetValueForField } from './has_unset_value_for_field';

/**
 * This is used for getting the list of environments for the environment selector,
 * filtered by range.
 */
export async function getEnvironments({
  searchAggregatedTransactions,
  serviceName,
  apmEventClient,
  size,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  serviceName?: string;
  searchAggregatedTransactions: boolean;
  size: number;
  start: number;
  end: number;
}): Promise<Environment[]> {
  const operationName = serviceName ? 'get_environments_for_service' : 'get_environments';

  const params = {
    apm: {
      events: [
        getProcessorEventForTransactions(searchAggregatedTransactions),
        ProcessorEvent.metric,
        ProcessorEvent.error,
      ],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [...rangeQuery(start, end), ...termQuery(SERVICE_NAME, serviceName)],
      },
    },
    aggs: {
      environments: {
        terms: {
          field: SERVICE_ENVIRONMENT,
          size,
        },
      },
    },
  };

  const [hasUnsetEnvironments, resp] = await Promise.all([
    hasUnsetValueForField({
      apmEventClient,
      searchAggregatedTransactions,
      serviceName,
      fieldName: SERVICE_ENVIRONMENT,
      start,
      end,
    }),
    apmEventClient.search(operationName, params),
  ]);

  const environmentsBuckets = resp.aggregations?.environments.buckets || [];

  const environments = environmentsBuckets.map(
    (environmentBucket) => environmentBucket.key as string
  );

  if (hasUnsetEnvironments) {
    environments.push(ENVIRONMENT_NOT_DEFINED.value);
  }

  return environments as Environment[];
}
