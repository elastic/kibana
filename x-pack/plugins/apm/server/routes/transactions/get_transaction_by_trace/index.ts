/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { TRACE_ID, PARENT_ID } from '../../../../common/es_fields/apm';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export async function getRootTransactionByTraceId(
  traceId: string,
  apmEventClient: APMEventClient
) {
  const params = {
    apm: {
      events: [ProcessorEvent.transaction as const],
    },
    body: {
      track_total_hits: false,
      size: 1,
      query: {
        bool: {
          should: [
            {
              constant_score: {
                filter: {
                  bool: {
                    must_not: { exists: { field: PARENT_ID } },
                  },
                },
              },
            },
          ],
          filter: [{ term: { [TRACE_ID]: traceId } }],
        },
      },
    },
  };

  const resp = await apmEventClient.search(
    'get_root_transaction_by_trace_id',
    params
  );
  return {
    transaction: resp.hits.hits[0]?._source,
  };
}
