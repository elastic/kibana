/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import { type Error } from '@kbn/apm-types';
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { compactMap } from '../../utils/compact_map';
import { createApmEventFieldsAccessor } from '../../utils/create_apm_event_fields_accessor';
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
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { ApmDocumentType } from '../../../common/document_type';
import { RollupInterval } from '../../../common/rollup';

export async function getApmTraceError(params: {
  apmEventClient: APMEventClient;
  logger: Logger;
  traceId: string;
  docId?: string;
  start: number;
  end: number;
}) {
  const { logger } = params;
  const response = await getApmTraceErrorQuery(params);

  // Error documents can be OTel-native or partial/legacy APM docs that do not always populate
  // every required field. Skipping a malformed hit keeps the whole request from failing with a
  // 500.
  const accessor = createApmEventFieldsAccessor({ logger, operation: 'get_apm_trace_error' });

  return compactMap(response.hits.hits, (hit): Error | undefined => {
    const errorSource = 'error' in hit._source ? hit._source : undefined;
    const event = accessor.tryAccess(hit, requiredFields);

    if (!event) {
      return undefined;
    }

    const { _id: id, parent, error, ...unflattened } = event.unflatten();

    // `error.id` is not guaranteed to be present on every error document in the error index
    // (e.g. OTel-native exception/error events). Skip such documents instead of throwing so a
    // single error doc without `error.id` cannot fail the entire trace request with a 500.
    if (!error?.id) {
      return undefined;
    }

    return {
      id,
      source: 'apm' as const,
      parent: {
        id: parent?.id ?? unflattened.span?.id,
      },
      trace: unflattened.trace,
      span: unflattened.span,
      transaction: unflattened.transaction,
      timestamp: unflattened.timestamp,
      service: { name: unflattened.service.name },
      error: {
        exception:
          (errorSource?.error?.exception?.length ?? 0) > 0
            ? errorSource?.error?.exception?.[0]
            : error.exception,
        grouping_key: error?.grouping_key,
        culprit: error?.culprit,
        id: error?.id,
        log: errorSource?.error.log,
      },
      index: hit._index,
    };
  });
}

const requiredFields = asMutableArray([
  TIMESTAMP_US,
  TRACE_ID,
  SERVICE_NAME,
  ERROR_GROUP_ID,
  PROCESSOR_EVENT,
  ID,
] as const);

// `ERROR_ID` is optional: OTel-native exception/error events are not guaranteed to carry
// `error.id`. Documents without it are skipped in the mapping above rather than throwing.
const optionalFields = asMutableArray([
  PARENT_ID,
  TRANSACTION_ID,
  SPAN_ID,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  ERROR_ID,
  ERROR_CULPRIT,
  ERROR_LOG_MESSAGE,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_HANDLED,
  ERROR_EXC_TYPE,
] as const);

const excludedLogLevels = ['debug', 'info', 'warning'];

// Waterfall items key errors by `span.id ?? transaction.id` (see `getErrorsByDocId`), so an error
// carrying only a transaction ref belongs to the transaction doc. Mirroring that here keeps the
// error badge count and the fetched errors in sync for classic APM transaction errors.
function docIdQuery(docId?: string): QueryDslQueryContainer[] {
  if (!docId) {
    return [];
  }

  return [
    {
      bool: {
        should: [
          ...termQuery(SPAN_ID, docId),
          {
            bool: {
              filter: termQuery(TRANSACTION_ID, docId),
              must_not: { exists: { field: SPAN_ID } },
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
  ];
}

function getApmTraceErrorQuery({
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
        filter: [...termQuery(TRACE_ID, traceId), ...docIdQuery(docId), ...rangeQuery(start, end)],
        must_not: { terms: { [ERROR_LOG_LEVEL]: excludedLogLevels } },
      },
    },
    fields: [...requiredFields, ...optionalFields],
    _source: [ERROR_LOG_MESSAGE, ERROR_EXC_MESSAGE, ERROR_EXC_HANDLED, ERROR_EXC_TYPE],
  });
}
