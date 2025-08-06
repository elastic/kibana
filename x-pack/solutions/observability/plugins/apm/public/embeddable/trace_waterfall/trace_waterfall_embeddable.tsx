/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { isPending, useFetcher } from '../../hooks/use_fetcher';
import { Loading } from './loading';
import type { ApmTraceWaterfallEmbeddableEntryProps } from './react_embeddable_factory';
import { TraceWaterfall } from '../../components/shared/trace_waterfall';

export function TraceWaterfallEmbeddable({
  serviceName,
  entryTransactionId,
  rangeFrom,
  rangeTo,
  traceId,
  displayLimit,
  scrollElement,
  onNodeClick,
  getRelatedErrorsHref,
}: ApmTraceWaterfallEmbeddableEntryProps) {
  const { data, status } = useFetcher(
    (callApmApi) => {
      // eslint-disable-next-line no-console
      console.log('🔍 Trace embeddable fetching with:', {
        traceId,
        entryTransactionId,
        rangeFrom,
        rangeTo,
      });
      return callApmApi('GET /internal/apm/traces/{traceId}', {
        params: {
          path: { traceId },
          query: { entryTransactionId, start: rangeFrom, end: rangeTo },
        },
      });
    },
    [entryTransactionId, rangeFrom, rangeTo, traceId]
  );

  if (isPending(status)) {
    return <Loading />;
  }

  // eslint-disable-next-line no-console
  console.log('🔍 Trace embeddable received data:', {
    hasEntryTransaction: !!data?.entryTransaction,
    entryTransactionId: data?.entryTransaction?.transaction?.id,
    traceDocsCount: data?.traceItems?.traceDocs?.length || 0,
    firstTraceDoc: data?.traceItems?.traceDocs?.[0],
  });

  // Convert the regular trace items to the format expected by TraceWaterfall
  const traceItems = data?.traceItems
    ? [
        ...(data.entryTransaction
          ? [
              {
                id: data.entryTransaction.transaction.id,
                timestampUs:
                  data.entryTransaction.timestamp?.us ||
                  new Date(data.entryTransaction['@timestamp']).getTime() * 1000,
                name: data.entryTransaction.transaction.name,
                traceId: data.entryTransaction.trace.id,
                duration: data.entryTransaction.transaction.duration?.us || 0,
                status: data.entryTransaction.event?.outcome
                  ? {
                      fieldName: 'event.outcome' as const,
                      value: data.entryTransaction.event.outcome,
                    }
                  : undefined,
                errorCount: 0,
                parentId: data.entryTransaction.parent?.id,
                serviceName: data.entryTransaction.service.name,
                spanType: undefined, // This is a transaction, not a span
              },
            ]
          : []),
        ...data.traceItems.traceDocs.map((doc: any) => ({
          id: doc.span?.id || doc.transaction?.id,
          timestampUs: doc.timestamp?.us || new Date(doc['@timestamp']).getTime() * 1000,
          name: doc.span?.name || doc.transaction?.name,
          traceId: doc.trace.id,
          duration: doc.span?.duration?.us || doc.transaction?.duration?.us || 0,
          status: doc.event?.outcome
            ? {
                fieldName: 'event.outcome' as const,
                value: doc.event.outcome,
              }
            : undefined,
          errorCount: 0,
          parentId: doc.parent?.id,
          serviceName: doc.service.name,
          spanType: doc.span?.type,
        })),
      ]
    : [];

  return (
    <TraceWaterfall
      traceItems={traceItems}
      onClick={onNodeClick}
      scrollElement={scrollElement}
      getRelatedErrorsHref={getRelatedErrorsHref}
      isEmbeddable
      showLegend
      serviceName={serviceName}
    />
  );
}
