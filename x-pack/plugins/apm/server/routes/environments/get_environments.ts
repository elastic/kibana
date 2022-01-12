/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import { ProcessorEvent } from '../../../common/processor_event';
import { rangeQuery, termQuery } from '../../../../observability/server';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import { Setup } from '../../lib/helpers/setup_request';
import { Environment } from '../../../common/environment_rt';

/**
 * This is used for getting the list of environments for the environments selector,
 * filtered by range.
 */
export async function getEnvironments({
  searchAggregatedTransactions,
  serviceName,
  setup,
  size,
  start,
  end,
}: {
  setup: Setup;
  serviceName?: string;
  searchAggregatedTransactions: boolean;
  size: number;
  start: number;
  end: number;
}) {
  const operationName = serviceName
    ? 'get_environments_for_service'
    : 'get_environments';

  const { apmEventClient } = setup;

  const params = {
    apm: {
      events: [
        getProcessorEventForTransactions(searchAggregatedTransactions),
        ProcessorEvent.metric,
        ProcessorEvent.error,
      ],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            ...termQuery(SERVICE_NAME, serviceName),
          ],
        },
      },
      aggs: {
        environments: {
          terms: {
            field: SERVICE_ENVIRONMENT,
            missing: ENVIRONMENT_NOT_DEFINED.value,
            size,
          },
        },
      },
    },
  };

  const resp = await apmEventClient.search(operationName, params);
  const aggs = resp.aggregations;
  const environmentsBuckets = aggs?.environments.buckets || [];

  const environments = environmentsBuckets.map(
    (environmentBucket) => environmentBucket.key as string
  );

  return environments as Environment[];
}
