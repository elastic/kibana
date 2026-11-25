/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

/**
 * Returns true when at least one document in range has none of the given fields set.
 * Used by the environment selector to decide whether to offer "Not defined".
 */
export async function hasUnsetValueForFields({
  searchAggregatedTransactions,
  apmEventClient,
  serviceName,
  fieldNames,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  serviceName: string | undefined;
  fieldNames: readonly string[];
  start: number;
  end: number;
}): Promise<boolean> {
  const params = {
    apm: {
      events: [
        getProcessorEventForTransactions(searchAggregatedTransactions),
        ProcessorEvent.metric,
        ProcessorEvent.error,
      ],
    },
    track_total_hits: true,
    terminate_after: 1,
    size: 0,
    query: {
      bool: {
        filter: [...rangeQuery(start, end), ...termQuery(SERVICE_NAME, serviceName)],
        must_not: fieldNames.map((field) => ({ exists: { field } })),
      },
    },
  };
  const resp = await apmEventClient.search('has_unset_value_for_fields', params);
  return resp.hits.total?.value > 0;
}
