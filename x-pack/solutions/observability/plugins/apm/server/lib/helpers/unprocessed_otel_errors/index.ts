/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { Error as ApmError } from '@kbn/apm-types';
import { existsQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  AT_TIMESTAMP,
  EXCEPTION_MESSAGE,
  EXCEPTION_TYPE,
  ID,
  OTEL_EVENT_NAME,
  PROCESSOR_EVENT,
  SERVICE_NAME,
  SPAN_ID,
  TIMESTAMP_US,
  TRACE_ID,
} from '../../../../common/es_fields/apm';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';

/**
 * Fields that every usable OTel exception log must carry.
 * SPAN_ID is intentionally absent — service-wide logs may not have a span.
 * TRACE_ID is intentionally absent — some logs (e.g. background workers) carry no trace.
 */
export const requiredOtelFields = asMutableArray([ID, SERVICE_NAME, AT_TIMESTAMP] as const);

/**
 * Fields that are requested from ES but may be absent in any given document.
 * TRACE_ID is here (not in required) because a missing trace id makes the row
 * less useful but not unusable — it still renders with a Discover link via `documentId`.
 */
export const optionalOtelFields = asMutableArray([
  SPAN_ID,
  TRACE_ID,
  EXCEPTION_TYPE,
  EXCEPTION_MESSAGE,
  OTEL_EVENT_NAME,
  TIMESTAMP_US,
] as const);

/**
 * The three-clause discriminator that identifies an unprocessed OTel exception log.
 * Must stay in sync with the ES|QL counterpart in
 * `public/components/shared/links/discover_links/get_esql_query.tsx`
 * (UNPROCESSED_OTEL_EXCEPTION_KQL), which mirrors it verbatim.
 *
 * The three clauses are ORed (`minimum_should_match: 1`) because not all SDKs
 * set all fields: some omit `event_name` but always set `exception.type`/`exception.message`.
 */
export function unprocessedOtelExceptionQuery(
  filter: QueryDslQueryContainer[]
): QueryDslQueryContainer {
  return {
    bool: {
      filter,
      should: [
        ...termQuery(OTEL_EVENT_NAME, 'exception'),
        ...existsQuery(EXCEPTION_TYPE),
        ...existsQuery(EXCEPTION_MESSAGE),
      ],
      minimum_should_match: 1,
      must_not: { exists: { field: PROCESSOR_EVENT } },
    },
  };
}

/**
 * Maps a single ES hit to an `ApmError` row without throwing.
 *
 * Returns `null` for any doc that is missing the minimum required fields (`_id`,
 * `service.name`, `@timestamp`) so that `compactMap` can silently skip them.
 * This replaces `requireFields` / `ensureRequiredApmFields`, which throw and cause
 * the whole request to fail with HTTP 500 when even one document is malformed.
 *
 * @param hit - A raw ES hit with a `fields` property.
 * @param opts.traceId - When provided, overrides the per-document `trace.id` value.
 *   Used by the trace-scoped endpoint where `trace.id` is always the route param.
 */
export function toUnprocessedOtelError(
  hit: { _id?: string; _index?: string; fields?: Record<string, unknown[] | undefined> },
  opts: { traceId?: string } = {}
): ApmError | null {
  const fields = hit.fields ?? {};

  // Scalar helper: ES `fields` API returns arrays even for single-valued fields.
  function field<T = string>(name: string): T | undefined {
    const v = fields[name];
    return Array.isArray(v) && v.length > 0 ? (v[0] as T) : undefined;
  }

  // Required guards — drop the doc rather than throwing.
  const id = hit._id;
  const serviceName = field(SERVICE_NAME);
  const atTimestamp = field(AT_TIMESTAMP);

  if (!id || !serviceName || !atTimestamp) {
    return null;
  }

  const timestampUs = field<number>(TIMESTAMP_US) ?? new Date(atTimestamp).getTime() * 1000;
  const spanId = field(SPAN_ID);
  const traceId = opts.traceId ?? field(TRACE_ID);

  const error: ApmError = {
    id,
    source: 'unprocessedOtel',
    span: spanId ? { id: spanId } : undefined,
    trace: traceId ? { id: traceId } : undefined,
    timestamp: { us: timestampUs },
    eventName: field(OTEL_EVENT_NAME),
    service: { name: serviceName },
    error: {
      exception: {
        type: field(EXCEPTION_TYPE),
        message: field(EXCEPTION_MESSAGE),
      },
    },
    index: hit._index,
  };

  return error;
}
