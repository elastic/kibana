/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { SERVICE_ENVIRONMENT } from '../../../common/es_fields/apm';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import { Environment } from '../../../common/environment_rt';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

/**
 * This is used for getting the list of environments for the environment's selector,
 * filtered by range.
 */

export async function getEnvironments({
  searchAggregatedTransactions,
  serviceName = '',
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
}) {
  const operationName = serviceName
    ? 'get_environments_for_service'
    : 'get_environments';

  const params = {
    apm: {
      events: [
        getProcessorEventForTransactions(searchAggregatedTransactions),
        ProcessorEvent.metric,
        ProcessorEvent.error,
      ],
    },
    size,
    field: SERVICE_ENVIRONMENT,
    string: serviceName,
    index_filter: {
      bool: {
        filter: [...rangeQuery(start, end)],
      },
    },
  };

  const resp = await apmEventClient.termsEnum(operationName, params);
  const environments = resp.terms || [];

  return environments as Environment[];
}
