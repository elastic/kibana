/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootTransactionByTraceIdResponse } from '@kbn/apm-api-shared';
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import {
  AT_TIMESTAMP,
  PARENT_ID,
  SERVICE_NAME,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { maybe } from '../../../../common/utils/maybe';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

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
}): Promise<RootTransactionByTraceIdResponse> {
  const requiredFields = asMutableArray([
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
    fields: requiredFields,
  };

  const resp = await apmEventClient.search('get_root_transaction_by_trace_id', params);

  const fields = maybe(resp.hits.hits[0])?.fields;

  const event =
    fields && accessKnownApmEventFields(fields).requireFields(requiredFields).unflatten();

  return {
    transaction: event,
  };
}
