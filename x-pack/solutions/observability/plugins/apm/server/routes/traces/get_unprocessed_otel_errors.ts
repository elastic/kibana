/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import type { FlattenedApmEvent } from '@kbn/apm-data-access-plugin/server/utils/utility_types';
import type { Error } from '@kbn/apm-types';
import { existsQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
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
} from '../../../common/es_fields/apm';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import type { LogsClient } from '../../lib/helpers/create_es_client/create_logs_client';
import { compactMap } from '../../utils/compact_map';

const requiredOtelFields = asMutableArray([SPAN_ID, ID, SERVICE_NAME, AT_TIMESTAMP] as const);
const optionalOtelFields = asMutableArray([
  EXCEPTION_TYPE,
  EXCEPTION_MESSAGE,
  OTEL_EVENT_NAME,
  TIMESTAMP_US,
] as const);

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
    query: {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          ...termQuery(TRACE_ID, traceId),
          ...termQuery(SPAN_ID, docId),
        ],
        should: [
          ...termQuery(OTEL_EVENT_NAME, 'exception'),
          ...existsQuery(EXCEPTION_TYPE),
          ...existsQuery(EXCEPTION_MESSAGE),
        ],
        minimum_should_match: 1,
        must_not: { exists: { field: PROCESSOR_EVENT } },
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

    const timestamp = event[TIMESTAMP_US] ?? new Date(event[AT_TIMESTAMP]).getTime() * 1000;

    const error: Error = {
      id: event[ID],
      span: { id: event[SPAN_ID] },
      trace: { id: traceId },
      timestamp: { us: timestamp },
      eventName: event[OTEL_EVENT_NAME],
      service: { name: event[SERVICE_NAME] },
      error: {
        exception: {
          type: event[EXCEPTION_TYPE],
          message: event[EXCEPTION_MESSAGE],
        },
      },
      index: hit._index,
    };

    return error;
  });
}
