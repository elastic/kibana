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
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

/**
 * This is used for getting the list of environments for the environment selector,
 * filtered by range.
 */

export async function hasUnsetEnvironments({
  searchAggregatedTransactions,
  apmEventClient,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
}): Promise<boolean> {
  const operationName = 'is_unset_environments';

  const params = {
    apm: {
      events: [
        getProcessorEventForTransactions(searchAggregatedTransactions),
        ProcessorEvent.metric,
        ProcessorEvent.error,
      ],
    },
    track_total_hits: true,
    size: 0,
    query: {
      bool: {
        filter: [...rangeQuery(start, end)],
        must_not: [
          {
            exists: {
              field: SERVICE_ENVIRONMENT,
            },
          },
        ],
      },
    },
  };
  const resp = await apmEventClient.search(operationName, params);
  return resp.hits.total?.value > 0;
}
