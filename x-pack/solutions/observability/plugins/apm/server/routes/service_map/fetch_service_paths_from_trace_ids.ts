/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { OperatorFunction } from 'rxjs';
import { from, Observable, defer } from 'rxjs';
import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { PassThrough } from 'stream';
import {
  AGENT_NAME,
  PARENT_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  TRANSACTION_ID,
  SPAN_ID,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRACE_ID,
} from '../../../common/es_fields/apm';
import type { EsClient } from '../../lib/helpers/get_esql_client';

export function fetchServicePathsFromTraceIds({
  traceIds,
  start,
  end,
  terminateAfter,
  esqlClient,
  index,
  filters,
}: {
  traceIds: string[];
  start: number;
  end: number;
  terminateAfter: number;
  esqlClient: EsClient;
  index: string[];
  filters: QueryDslQueryContainer[];
}) {
  const stream = new PassThrough();

  defer(() =>
    from(
      esqlClient.esql(
        'get_service_paths_from_trace_ids',
        {
          query: `
              FROM ${index.join(',')}
                | LIMIT ${terminateAfter}
                | EVAL event.id = CASE(processor.event == "span", ${SPAN_ID}, ${TRANSACTION_ID})
                | KEEP event.id,
                      ${SPAN_DESTINATION_SERVICE_RESOURCE},
                      ${SPAN_SUBTYPE},
                      ${SPAN_TYPE},
                      ${AGENT_NAME},
                      ${SERVICE_NAME},
                      ${SERVICE_ENVIRONMENT},
                      ${PARENT_ID}
            `,
          filter: {
            bool: {
              filter: [...rangeQuery(start, end), ...termsQuery(TRACE_ID, ...traceIds), ...filters],
            },
          },
          format: 'arrow',
        },
        { transform: 'none' }
      ) as unknown as Observable<Uint8Array>
    )
  )
    .pipe(flushBuffer(false))
    .subscribe({
      next: (event) => {
        if (!stream.write(event)) {
          stream.pause();
          stream.once('drain', () => stream.resume());
        }
      },
      error: (error) => {
        console.error(error);
        stream.end();
      },
      complete: () => {
        stream.end();
      },
    });

  return stream;
}

function flushBuffer<T extends Uint8Array>(isCloud: boolean): OperatorFunction<T, T> {
  return (source: Observable<T>) =>
    new Observable<T>((subscriber) => {
      const cloudProxyBufferSize = 4096;
      let currentBuffer: Uint8Array[] = [];
      let currentBufferSize: number = 0;

      const flushBufferIfNeeded = () => {
        if (currentBuffer.length > 0) {
          for (const chunk of currentBuffer) {
            subscriber.next(chunk as unknown as T);
          }
          currentBuffer = [];
          currentBufferSize = 0;
        }
      };

      const keepAlive = () => {
        const keepAliveBuffer = new Uint8Array();
        subscriber.next(keepAliveBuffer as T);
      };

      const flushIntervalId = isCloud ? setInterval(flushBufferIfNeeded, 250) : undefined;
      const keepAliveIntervalId = setInterval(keepAlive, 30_000);

      source.subscribe({
        next: (batch) => {
          const batchSize = batch.length;
          if (currentBufferSize + batchSize > cloudProxyBufferSize) {
            flushBufferIfNeeded();
          }
          currentBuffer.push(batch);
          currentBufferSize += batchSize;
        },
        error: (error) => {
          clearInterval(flushIntervalId);
          clearInterval(keepAliveIntervalId);
          subscriber.error(error);
        },
        complete: () => {
          flushBufferIfNeeded(); // Flush any remaining data
          clearInterval(flushIntervalId);
          clearInterval(keepAliveIntervalId);
          subscriber.complete();
        },
      });
    });
}
