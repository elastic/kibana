/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';
import type { SpanLink } from '@kbn/apm-types/es_schemas_raw';
import {
  PRODUCTION_ENVIRONMENT,
  SERVICE_SPAN_LINKS_PRODUCER_INTERNAL_ONLY,
  SERVICE_SPAN_LINKS_CONSUMER_MULTIPLE,
  SPAN_LINKS_START_DATE,
  SPAN_LINKS_PRODUCER_INTERNAL_ONLY_END,
} from '../constants';

/**
 * Data ingestion summary:
 *
 * zzz-producer-internal-only (go)
 * --Transaction A
 * ----Span A
 *
 * zzz-producer-external-only (java)
 * --Transaction B
 * ----Span B
 * ------span.links=external link
 * ----Span B1
 *
 * zzz-producer-consumer (ruby)
 * --Transaction C
 * ------span.links=zzz-producer-internal-only / Span A
 * ----Span C
 *
 * zzz-consumer-multiple (nodejs)
 * --Transaction D
 * ------span.links= zzz-producer-consumer / Span C | zzz-producer-internal-only / Span A
 * ----Span E
 * ------span.links= zzz-producer-external-only / Span B | zzz-producer-consumer / Transaction C
 */
export function generateSpanLinksData(): SynthtraceGenerator<ApmFields> {
  // Create service instances
  const producerInternalOnly = apm
    .service({
      name: SERVICE_SPAN_LINKS_PRODUCER_INTERNAL_ONLY,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'go',
    })
    .instance('instance a');

  const producerExternalOnly = apm
    .service({
      name: 'zzz-producer-external-only',
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'java',
    })
    .instance('instance b');

  const producerConsumer = apm
    .service({
      name: 'zzz-producer-consumer',
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'ruby',
    })
    .instance('instance c');

  const consumerMultiple = apm
    .service({
      name: SERVICE_SPAN_LINKS_CONSUMER_MULTIPLE,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'nodejs',
    })
    .instance('instance d');

  // Generate events
  const producerInternalOnlyEvents = Array.from(
    timerange(new Date(SPAN_LINKS_START_DATE), new Date(SPAN_LINKS_PRODUCER_INTERNAL_ONLY_END))
      .interval('1m')
      .rate(1)
      .generator((timestamp) =>
        producerInternalOnly
          .transaction({ transactionName: 'Transaction A' })
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .children(
            producerInternalOnly
              .span({ spanName: 'Span A', spanType: 'external', spanSubtype: 'http' })
              .timestamp(timestamp + 50)
              .duration(100)
              .success()
          )
      )
  );

  const pioFields = producerInternalOnlyEvents.flatMap((e) => e.serialize());
  const pioSpan = pioFields.find((i) => i['processor.event'] === 'span');

  const spanASpanLink: SpanLink = {
    trace: { id: pioSpan!['trace.id']! },
    span: { id: pioSpan!['span.id']! },
  };

  const producerExternalOnlyEvents = Array.from(
    timerange(new Date('2022-01-01T00:02:00.000Z'), new Date('2022-01-01T00:03:00.000Z'))
      .interval('1m')
      .rate(1)
      .generator((timestamp) =>
        producerExternalOnly
          .transaction({ transactionName: 'Transaction B' })
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .children(
            producerExternalOnly
              .span({ spanName: 'Span B', spanType: 'external', spanSubtype: 'http' })
              .defaults({ 'span.links': [{ trace: { id: 'trace#1' }, span: { id: 'span#1' } }] })
              .timestamp(timestamp + 50)
              .duration(100)
              .success(),
            producerExternalOnly
              .span({ spanName: 'Span B.1', spanType: 'external', spanSubtype: 'http' })
              .timestamp(timestamp + 50)
              .duration(100)
              .success()
          )
      )
  );

  const peoFields = producerExternalOnlyEvents.flatMap((e) => e.serialize());
  const peoSpan = peoFields.find(
    (i) => i['processor.event'] === 'span' && i['span.name'] === 'Span B'
  );

  const spanBSpanLink: SpanLink = {
    trace: { id: peoSpan!['trace.id']! },
    span: { id: peoSpan!['span.id']! },
  };

  const producerConsumerEvents = Array.from(
    timerange(new Date('2022-01-01T00:04:00.000Z'), new Date('2022-01-01T00:05:00.000Z'))
      .interval('1m')
      .rate(1)
      .generator((timestamp) =>
        producerConsumer
          .transaction({ transactionName: 'Transaction C' })
          .defaults({ 'span.links': [spanASpanLink] })
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .children(
            producerConsumer
              .span({ spanName: 'Span C', spanType: 'external', spanSubtype: 'http' })
              .timestamp(timestamp + 50)
              .duration(100)
              .success()
          )
      )
  );

  const pcFields = producerConsumerEvents.flatMap((e) => e.serialize());
  const pcTx = pcFields.find((i) => i['processor.event'] === 'transaction');
  const pcSpan = pcFields.find((i) => i['processor.event'] === 'span');

  const transactionCSpanLink: SpanLink = {
    trace: { id: pcTx!['trace.id']! },
    span: { id: pcTx!['transaction.id']! },
  };

  const spanCSpanLink: SpanLink = {
    trace: { id: pcSpan!['trace.id']! },
    span: { id: pcSpan!['span.id']! },
  };

  const consumerMultipleEvents = Array.from(
    timerange(new Date('2022-01-01T00:06:00.000Z'), new Date('2022-01-01T00:07:00.000Z'))
      .interval('1m')
      .rate(1)
      .generator((timestamp) =>
        consumerMultiple
          .transaction({ transactionName: 'Transaction D' })
          .defaults({ 'span.links': [spanASpanLink, spanCSpanLink] })
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .children(
            consumerMultiple
              .span({ spanName: 'Span E', spanType: 'external', spanSubtype: 'http' })
              .defaults({ 'span.links': [spanBSpanLink, transactionCSpanLink] })
              .timestamp(timestamp + 50)
              .duration(100)
              .success()
          )
      )
  );

  // Create a generator from all events
  const allEvents = [
    ...producerInternalOnlyEvents,
    ...producerExternalOnlyEvents,
    ...producerConsumerEvents,
    ...consumerMultipleEvents,
  ];

  function* eventsGenerator(): SynthtraceGenerator<ApmFields> {
    yield* allEvents;
  }

  return eventsGenerator();
}
