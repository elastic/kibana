/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { OperatorFunction } from 'rxjs';
import { from, Observable, defer, skipWhen } from 'rxjs';
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
  spanIds,
  start,
  end,
  terminateAfter,
  esqlClient,
  index,
  filters,
}: {
  spanIds: string[];
  start: number;
  end: number;
  terminateAfter: number;
  esqlClient: EsClient;
  index: string[];
  filters: QueryDslQueryContainer[];
}) {
  const stream = new PassThrough();

  if (spanIds.length === 0) {
    stream.end();
    return stream;
  }

  //   | STATS exit_span = MAX(exit_span)
  //   BY trace.id, service.node.name, service.name, agent.name, service.environment, entry_transaction, processor.event, span.destination.service.resource
  // | STATS entry_transaction = MAX(entry_transaction) WHERE processor.event == "transaction",
  //     exit_span = VALUES(exit_span)
  //   BY trace.id, service.node.name, service.name, agent.name, service.environment
  defer(() =>
    from(
      esqlClient.esql(
        'get_service_paths_from_trace_ids',
        {
          // query: `
          //     FROM ${index.join(',')}
          // | EVAL exit_span = CONCAT(@timestamp::string, "|",
          //       COALESCE(span.id, transaction.id), "|",
          //       COALESCE(span.type, "__EMPTY__"), "|",
          //       COALESCE(span.subtype, "__EMPTY__"), "|",
          //       COALESCE(span.destination.service.resource, "__EMPTY__"), "|",
          //       COALESCE(parent.id, "__EMPTY__"), "|",
          //       service.name, "|",
          //       COALESCE(service.environment, "__EMPTY__"))
          // | STATS exit_span = VALUES(exit_span)
          //   BY trace.id,
          //     service.node.name,
          //     service.name,
          //     agent.name,
          //     service.environment
          // | LIMIT ${terminateAfter}
          // | MV_EXPAND exit_span
          // | EVAL exit_span = SPLIT(exit_span, "|")
          // | EVAL event.id = MV_SLICE(exit_span, 1),
          //     span.type = MV_SLICE(exit_span, 2),
          //     span.subtype = MV_SLICE(exit_span, 3),
          //     span.destination.service.resource = MV_SLICE(exit_span, 4),
          //     parent.id = MV_SLICE(exit_span, 5),
          //     service.name = MV_SLICE(exit_span, 6),
          //     service.environment = MV_SLICE(exit_span, 7)
          // | EVAL span.type = CASE(span.type == "__EMPTY__", null, span.type),
          //     span.subtype = CASE(span.subtype == "__EMPTY__", null, span.subtype),
          //     span.destination.service.resource = CASE(span.destination.service.resource == "__EMPTY__",  null, span.destination.service.resource),
          //     service.environment = CASE(service.environment == "__EMPTY__", null, service.environment),
          //     parent.id = CASE(parent.id == "__EMPTY__", null, parent.id),
          //     transactionParentIds = event.id
          // | KEEP agent.name,
          //     service.name,
          //     service.environment,
          //     event.id,
          //     span.type,
          //     span.subtype,
          //     span.destination.service.resource,
          //     parent.id,
          //     transactionParentIds
          //   `,
          // query: `
          //   FROM ${index.join(',')}
          //   | EVAL transactions = CONCAT(@timestamp::string, "|", transaction.id, "|", COALESCE(parent.id, "__EMPTY__")),
          //       exitSpan = CONCAT(@timestamp::string, "|", COALESCE(span.id, "__EMPTY__"), "|",
          //         COALESCE(span.type, "__EMPTY__"), "|",
          //         COALESCE(span.subtype, "__EMPTY__"), "|",
          //         COALESCE(parent.id, "__EMPTY__"), "|",
          //         COALESCE(span.destination.service.resource, "__EMPTY__"))
          //   | STATS exitSpan = TOP(exitSpan, 3, "desc") WHERE processor.event == "span", transactions = TOP(transactions, 3, "desc") WHERE processor.event == "transaction"
          //     BY service.node.name,
          //       service.name,
          //       agent.name,
          //       service.environment
          //   | LIMIT 10000
          //   | MV_EXPAND transactions
          //   | MV_EXPAND exitSpan
          //   | EVAL tempStat = SPLIT(exitSpan, "|"),
          //       tempTransaction = SPLIT(transactions, "|")
          //   | EVAL span.timestamp = MV_SLICE(tempStat, 0),
          //       span.id = MV_SLICE(tempStat, 1),
          //       span.parent.id = MV_SLICE(tempStat, 3),
          //       span.destination.service.resource = MV_SLICE(tempStat, 5),
          //       transaction.timestamp = MV_SLICE(tempTransaction, 0),
          //       transaction.id = MV_SLICE(tempTransaction, 1),
          //       transaction.parent.id = MV_SLICE(tempTransaction, 2)
          //   | EVAL span.timestamp = TO_DATETIME(span.timestamp),
          //       transaction.timestamp = TO_DATETIME(transaction.timestamp),
          //       transaction.parent.id = CASE(transaction.parent.id == "__EMPTY__", null, transaction.parent.id)
          //   | WHERE DATE_DIFF("microseconds", transaction.timestamp, span.timestamp) >= 0
          //   | STATS  exitSpan = MIN(exitSpan) BY
          //       service.node.name,
          //       service.name,
          //       agent.name,
          //       service.environment,
          //       span.destination.service.resource,
          //       transaction.id,
          //       transaction.parent.id
          //   | EVAL exitSpan = SPLIT(exitSpan, "|")
          //   | EVAL span.id = MV_SLICE(exitSpan, 1),
          //       span.type = MV_SLICE(exitSpan, 2),
          //       span.subtype = MV_SLICE(exitSpan, 3),
          //       parent.id = MV_SLICE(exitSpan, 4)
          //   | EVAL span.id = CASE(span.id == "__EMPTY__", null, span.id),
          //       span.type = CASE(span.type == "__EMPTY__", null, span.type),
          //       span.subtype = CASE(span.subtype == "__EMPTY__", null, span.subtype),
          //       parent.id = CASE(parent.id == "__EMPTY__", null, parent.id),
          //       span.destination.service.resource = CASE(span.destination.service.resource == "__EMPTY__", null, span.destination.service.resource)
          //   | KEEP agent.name,
          //       service.name,
          //       service.node.name,
          //       service.environment,
          //       span.id,
          //       span.type,
          //       span.subtype,
          //       span.destination.service.resource,
          //       parent.id,
          //       transaction.id,
          //       transaction.parent.id
          // `,
          query: `
          FROM ${index.join(',')}
          | LIMIT 10000
          | KEEP agent.name,
              service.name,
              service.node.name,
              service.environment,
              span.id,
              transaction.id,
              span.type,
              span.subtype,
              span.destination.service.resource,
              parent.id`,
          filter: {
            bool: {
              filter: [...rangeQuery(start, end), ...filters, ...termsQuery(PARENT_ID, ...spanIds)],
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
