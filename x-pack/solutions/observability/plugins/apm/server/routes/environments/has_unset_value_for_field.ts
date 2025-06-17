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
 * This is used for getting the list of environments for the environment selector,
 * filtered by range.
 */

export async function hasUnsetValueForField({
  searchAggregatedTransactions,
  apmEventClient,
  serviceName,
  fieldName,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  serviceName: string | undefined;
  fieldName: string;
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
        must_not: [
          {
            exists: {
              field: fieldName,
            },
          },
        ],
      },
    },
  };
  const resp = await apmEventClient.search('has_unset_value_for_field', params);
  return resp.hits.total?.value > 0;
}
