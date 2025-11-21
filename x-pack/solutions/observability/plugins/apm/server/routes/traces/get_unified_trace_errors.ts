/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { existsQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import type { FlattenedApmEvent } from '@kbn/apm-data-access-plugin/server/utils/utility_types';
import {
  EXCEPTION_MESSAGE,
  EXCEPTION_TYPE,
  SPAN_ID,
  TRACE_ID,
  TRANSACTION_ID,
  OTEL_EVENT_NAME,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  ERROR_EXC_HANDLED,
  ERROR_GROUP_ID,
  ERROR_CULPRIT,
  ERROR_ID,
  PARENT_ID,
} from '../../../common/es_fields/apm';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import type { LogsClient } from '../../lib/helpers/create_es_client/create_logs_client';
import type { Exception } from '../../../typings/es_schemas/raw/error_raw';
import {
  getApmTraceErrorQuery,
  requiredFields as requiredApmFields,
} from './get_apm_trace_error_query';
import { compactMap } from '../../utils/compact_map';

export interface UnifiedTraceErrors {
  apmErrors: Awaited<ReturnType<typeof getUnifiedApmTraceError>>;
  unprocessedOtelErrors: Awaited<ReturnType<typeof getUnprocessedOtelErrors>>;
  totalErrors: number;
}

export async function getUnifiedTraceErrors({
  apmEventClient,
  logsClient,
  end,
  start,
  traceId,
}: {
  apmEventClient: APMEventClient;
  logsClient: LogsClient;
  traceId: string;
  start: number;
  end: number;
}): Promise<UnifiedTraceErrors> {
  const [apmErrors, unprocessedOtelErrors] = await Promise.all([
    getUnifiedApmTraceError({ apmEventClient, traceId, start, end }),
    getUnprocessedOtelErrors({ logsClient, traceId, start, end }),
  ]);

  return {
    apmErrors,
    unprocessedOtelErrors,
    totalErrors: apmErrors.length + unprocessedOtelErrors.length,
  };
}

export const requiredOtelFields = asMutableArray([SPAN_ID] as const);
export const optionalOtelFields = asMutableArray([
  EXCEPTION_TYPE,
  EXCEPTION_MESSAGE,
] as const);

export interface UnifiedError {
  id: string;
  parentId?: string;
  error: {
    id?: string;
    exception?: Exception;
    grouping_key?: string;
    culprit?: string;
    log?: {
      message: string;
    };
  };
}

async function getUnifiedApmTraceError(params: {
  apmEventClient: APMEventClient;
  traceId: string;
  docId?: string;
  start: number;
  end: number;
}) {
  const response = await getApmTraceErrorQuery(params);

  return compactMap(response.hits.hits, (hit) => {
    const errorSource = 'error' in hit._source ? hit._source : undefined;
    const event = hit.fields
      ? accessKnownApmEventFields(hit.fields).requireFields(requiredApmFields)
      : undefined;

    const spanId = event?.[TRANSACTION_ID] ?? event?.[SPAN_ID];

    if (!event || !spanId) {
      return null;
    }

    const error: UnifiedError = {
      id: spanId,
      parentId: event[PARENT_ID] ?? spanId,
      error: {
        id: event[ERROR_ID],
        grouping_key: event[ERROR_GROUP_ID],
        log: errorSource?.error.log,
        culprit: event[ERROR_CULPRIT],
        exception: errorSource?.error.exception?.[0] ?? {
          type: event[ERROR_EXC_TYPE],
          message: event[ERROR_EXC_MESSAGE],
          handled: event[ERROR_EXC_HANDLED],
        },
      },
    };

    return error;
  });
}

async function getUnprocessedOtelErrors({
  logsClient,
  end,
  start,
  traceId,
}: {
  logsClient: LogsClient;
  traceId: string;
  start: number;
  end: number;
}) {
  const response = await logsClient.search({
    query: {
      bool: {
        filter: [...rangeQuery(start, end), ...termQuery(TRACE_ID, traceId)],
        should: [
          ...termQuery(OTEL_EVENT_NAME, 'exception'),
          ...existsQuery(EXCEPTION_TYPE),
          ...existsQuery(EXCEPTION_MESSAGE),
        ],
        minimum_should_match: 1,
      },
    },
    fields: [...requiredOtelFields, ...optionalOtelFields],
  });

  return compactMap(response.hits.hits, (hit) => {
    const event = hit.fields
      ? accessKnownApmEventFields(hit.fields as Partial<FlattenedApmEvent>).requireFields(
          requiredOtelFields
        )
      : undefined;

    if (!event) return null;

    const error: UnifiedError = {
      id: event[SPAN_ID],
      error: {
        exception: {
          type: event[EXCEPTION_TYPE],
          message: event[EXCEPTION_MESSAGE],
        },
      },
    };

    return error;
  });
}
