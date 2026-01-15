/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { ApmDocumentType } from '../../../common/document_type';
import { RollupInterval } from '../../../common/rollup';

import {
  ID,
  ERROR_CULPRIT,
  ERROR_EXC_HANDLED,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  ERROR_GROUP_ID,
  ERROR_ID,
  ERROR_LOG_LEVEL,
  ERROR_LOG_MESSAGE,
  PARENT_ID,
  PROCESSOR_EVENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_ID,
  TIMESTAMP_US,
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../common/es_fields/apm';

export const requiredFields = asMutableArray([
  TIMESTAMP_US,
  TRACE_ID,
  SERVICE_NAME,
  ERROR_ID,
  ERROR_GROUP_ID,
  PROCESSOR_EVENT,
  ID,
] as const);

export const optionalFields = asMutableArray([
  PARENT_ID,
  TRANSACTION_ID,
  SPAN_ID,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  ERROR_CULPRIT,
  ERROR_LOG_MESSAGE,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_HANDLED,
  ERROR_EXC_TYPE,
] as const);

const excludedLogLevels = ['debug', 'info', 'warning'];

export function getApmTraceErrorQuery({
  apmEventClient,
  traceId,
  docId,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  traceId: string;
  docId?: string;
  start: number;
  end: number;
}) {
  return apmEventClient.search('get_errors_docs', {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.ErrorEvent,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    track_total_hits: false,
    size: 1000,
    query: {
      bool: {
        filter: [
          ...termQuery(TRACE_ID, traceId),
          ...termQuery(SPAN_ID, docId),
          ...rangeQuery(start, end),
        ],
        must_not: { terms: { [ERROR_LOG_LEVEL]: excludedLogLevels } },
      },
    },
    fields: [...requiredFields, ...optionalFields],
    _source: [ERROR_LOG_MESSAGE, ERROR_EXC_MESSAGE, ERROR_EXC_HANDLED, ERROR_EXC_TYPE],
  });
}
