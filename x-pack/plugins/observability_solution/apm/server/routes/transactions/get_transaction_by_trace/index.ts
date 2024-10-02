/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import {
  TRACE_ID,
  PARENT_ID,
  AT_TIMESTAMP,
  TIMESTAMP,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_REPRESENTATIVE_COUNT,
  TRANSACTION_RESULT,
  TRANSACTION_SAMPLED,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { transactionMapping } from '../../../utils/es_fields_mappings';

export async function getRootTransactionByTraceId({
  traceId,
  apmEventClient,
  start,
  end,
}: {
  traceId: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}) {
  const params = {
    apm: {
      events: [ProcessorEvent.transaction as const],
    },
    body: {
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
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
          filter: [{ term: { [TRACE_ID]: traceId } }, ...rangeQuery(start, end)],
        },
      },
      fields: [
        TRANSACTION_REPRESENTATIVE_COUNT,
        TRANSACTION_RESULT,
        TRANSACTION_SAMPLED,
        TRANSACTION_ID,
        TRANSACTION_DURATION,
        TRANSACTION_TYPE,
        TRANSACTION_NAME,
        TRACE_ID,
        TIMESTAMP,
        AT_TIMESTAMP,
      ],
    },
  };

  const resp = await apmEventClient.search('get_root_transaction_by_trace_id', params);

  return transactionMapping(resp.hits.hits[0]?.fields);
}
