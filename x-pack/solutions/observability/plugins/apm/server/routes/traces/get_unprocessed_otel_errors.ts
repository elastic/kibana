/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { SPAN_ID, TRACE_ID } from '../../../common/es_fields/apm';
import type { LogsClient } from '../../lib/helpers/create_es_client/create_logs_client';
import {
  optionalOtelFields,
  requiredOtelFields,
  toUnprocessedOtelError,
  unprocessedOtelExceptionQuery,
} from '../../lib/helpers/unprocessed_otel_errors';
import { compactMap } from '../../utils/compact_map';

/**
 * Fetches unprocessed OTel exception logs for a specific trace (and optionally span).
 * Thin wrapper around the shared `unprocessedOtelExceptionQuery` + `toUnprocessedOtelError`
 * helpers; the heavy lifting is in `server/lib/helpers/unprocessed_otel_errors/`.
 *
 * `traceId` is passed as an override to `toUnprocessedOtelError` so that every returned
 * row carries the correct trace id even when the document itself doesn't (the query already
 * filters on `trace.id`, so the value is always known from the route param).
 */
export async function getUnprocessedOtelErrors({
  logsClient,
  traceId,
  docId,
  start,
  end,
}: {
  logsClient: LogsClient;
  traceId: string;
  docId?: string;
  start: number;
  end: number;
}) {
  const response = await logsClient.search({
    query: unprocessedOtelExceptionQuery([
      ...rangeQuery(start, end),
      ...termQuery(TRACE_ID, traceId),
      ...termQuery(SPAN_ID, docId),
    ]),
    fields: [...requiredOtelFields, ...optionalOtelFields],
  });

  return compactMap(response.hits.hits, (hit) => toUnprocessedOtelError(hit, { traceId }));
}
