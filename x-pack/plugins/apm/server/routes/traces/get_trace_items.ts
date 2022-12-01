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
  AGENT,
  EVENT_OUTCOME,
  FAAS,
  PARENT_ID,
  PROCESSOR_EVENT,
  SERVICE,
  SPAN_DURATION,
  SPAN_LINKS,
  TIMESTAMP,
  TRACE_ID,
  TRANSACTION,
  TRANSACTION_DURATION,
  SPAN,
  CHILD_ID,
} from '../../../common/es_fields/apm';
import { getLinkedChildrenCountBySpanId } from '../span_links/get_linked_children';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { APMConfig } from '../..';
import { getErrorDocs } from './get_error_docs';
import {
  TraceItems,
  WaterfallSpanDoc,
  WaterfallTransactionDoc,
  WaterfallTransactionSpanBaseDoc,
} from '../../../common/waterfall_helper/typings';
import { Transaction } from '../../../typings/es_schemas/ui/transaction';
import { Span } from '../../../typings/es_schemas/ui/span';

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
      _source: [
        TIMESTAMP,
        TRACE_ID,
        SERVICE,
        AGENT,
        EVENT_OUTCOME,
        PARENT_ID,
        PROCESSOR_EVENT,
        TRANSACTION,
        FAAS,
        SPAN_LINKS,
        SPAN,
        CHILD_ID,
      ],
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
  const traceDocs = traceResponse.hits.hits.map(
    (hit): WaterfallTransactionDoc | WaterfallSpanDoc => {
      const source = hit._source;

      const baseDoc: WaterfallTransactionSpanBaseDoc = {
        timestamp: { us: new Date(hit._source[TIMESTAMP]).getTime() * 1000 },
        trace: { id: source.trace.id },
        service: source.service,
        agent: source.agent,
        event: { outcome: source.event?.outcome },
        parent: { id: source.parent?.id },
      };

      if (source.processor.event === ProcessorEvent.transaction) {
        const transaction = source as Transaction;
        const transactionDoc: WaterfallTransactionDoc = {
          ...baseDoc,
          processor: { event: ProcessorEvent.transaction },
          faas: transaction.faas,
          span: { links: transaction.span?.links },
          transaction: {
            duration: transaction.transaction.duration,
            id: transaction.transaction.id,
            name: transaction.transaction.name,
            type: transaction.transaction.type,
            result: transaction.transaction.result,
          },
        };
        return transactionDoc;
      } else {
        const span = source as Span;
        const spanDoc: WaterfallSpanDoc = {
          ...baseDoc,
          processor: { event: ProcessorEvent.span },
          child: span.child,
          span: {
            id: span.span.id,
            name: span.span.name,
            type: span.span.type,
            subtype: span.span.subtype,
            action: span.span.action,
            composite: span.span.composite,
            sync: span.span.sync,
            duration: span.span.duration,
            links: span.span.links,
          },
        };
        return spanDoc;
      }
    }
  );

  return {
    exceedsMax,
    traceDocs,
    errorDocs,
    linkedChildrenOfSpanCountBySpanId,
  };
}
