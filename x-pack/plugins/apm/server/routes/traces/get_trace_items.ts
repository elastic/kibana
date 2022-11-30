/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueryDslQueryContainer,
  Sort,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  PARENT_ID,
  SPAN_DURATION,
  TRACE_ID,
  TRANSACTION_DURATION,
} from '../../../common/es_fields/apm';
import { getLinkedChildrenCountBySpanId } from '../span_links/get_linked_children';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { APMConfig } from '../..';
import { getErrorDocs } from './get_error_docs';
import { TraceItems } from '../../../common/waterfall_helper/typings';

export async function getTraceItems(
  traceId: string,
  config: APMConfig,
  apmEventClient: APMEventClient,
  start: number,
  end: number
): Promise<TraceItems> {
  const maxTraceItems = config.ui.maxTraceItems;

  const traceResponsePromise = apmEventClient.search('get_trace_docs', {
    apm: {
      events: [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    body: {
      track_total_hits: maxTraceItems + 1,
      size: maxTraceItems,
      query: {
        bool: {
          filter: [
            { term: { [TRACE_ID]: traceId } },
            ...rangeQuery(start, end),
          ] as QueryDslQueryContainer[],
          should: {
            exists: { field: PARENT_ID },
          },
        },
      },
      sort: [
        { _score: { order: 'asc' as const } },
        { [TRANSACTION_DURATION]: { order: 'desc' as const } },
        { [SPAN_DURATION]: { order: 'desc' as const } },
      ] as Sort,
    },
  });

  const [errorDocs, traceResponse, linkedChildrenOfSpanCountBySpanId] =
    await Promise.all([
      getErrorDocs(traceId, config, apmEventClient, start, end),
      traceResponsePromise,
      getLinkedChildrenCountBySpanId({ traceId, apmEventClient, start, end }),
    ]);

  const exceedsMax = traceResponse.hits.total.value > maxTraceItems;
  const traceDocs = traceResponse.hits.hits.map((hit) => hit._source);

  return {
    exceedsMax,
    traceDocs,
    errorDocs,
    linkedChildrenOfSpanCountBySpanId,
  };
}
