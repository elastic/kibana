/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { TRANSACTION_ID } from '@kbn/observability-shared-plugin/common';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server';
import {
  TRACE_ID,
  PARENT_ID,
  AT_TIMESTAMP,
  TRANSACTION_TYPE,
  TRANSACTION_DURATION,
  SERVICE_NAME,
  TRANSACTION_NAME,
} from '../../../../common/es_fields/apm';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { maybe } from '../../../../common/utils/maybe';

export interface TransactionDetailRedirectInfo {
  [AT_TIMESTAMP]: string;
  trace: {
    id: string;
  };
  transaction: {
    id: string;
    type: string;
    name: string;

    duration: {
      us: number;
    };
  };
  service: {
    name: string;
  };
}

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
}): Promise<{ transaction: TransactionDetailRedirectInfo | undefined }> {
  const fields = asMutableArray([
    TRACE_ID,
    TRANSACTION_ID,
    TRANSACTION_NAME,
    AT_TIMESTAMP,
    TRANSACTION_TYPE,
    TRANSACTION_DURATION,
    SERVICE_NAME,
  ] as const);
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
      fields,
    },
  };

  const resp = await apmEventClient.search('get_root_transaction_by_trace_id', params);

  const event = unflattenKnownApmEventFields(maybe(resp.hits.hits[0])?.fields, fields);

  return {
    transaction: event,
  };
}
