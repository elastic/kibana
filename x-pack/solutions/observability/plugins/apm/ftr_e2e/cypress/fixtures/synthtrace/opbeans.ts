/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields } from '@kbn/apm-synthtrace-client';
import { apm, timerange, generateLongId, generateShortId } from '@kbn/apm-synthtrace-client';
import { shuffle, compact } from 'lodash';

function generateExternalSpanLinks() {
  return Array(2)
    .fill(0)
    .map(() => ({ span: { id: generateShortId() }, trace: { id: generateLongId() } }));
}

function getSpanLinksFromEvents(events: ApmFields[]) {
  return compact(
    events.map((event) => {
      const spanId = event['span.id'];
      return spanId ? { span: { id: spanId }, trace: { id: event['trace.id']! } } : undefined;
    })
  );
}

export function opbeans({ from, to }: { from: number; to: number }) {
  const range = timerange(from, to);
  const producerTimestamps = range.ratePerMinute(1);

  const opbeansJava = apm
    .service({
      name: 'opbeans-java',
      environment: 'production',
      agentName: 'java',
    })
    .instance('opbeans-java-prod-1')
    .podId('opbeans-java-prod-1-pod');

  const opbeansNode = apm
    .service({
      name: 'opbeans-node',
      environment: 'production',
      agentName: 'nodejs',
    })
    .instance('opbeans-node-prod-1');

  const opbeansRum = apm.browser({
    serviceName: 'opbeans-rum',
    environment: 'production',
    userAgent: apm.getChromeUserAgentDefaults(),
  });

  const opbeansJavaInternalOnlyEvents = producerTimestamps.generator((timestamp) =>
    opbeansJava
      .transaction({ transactionName: 'Transaction A' })
      .timestamp(timestamp)
      .duration(1000)
      .success()
      .children(
        opbeansJava
          .span({ spanName: 'Span A', spanType: 'messaging', spanSubtype: 'kafka' })
          .timestamp(timestamp)
          .duration(100)
          .success()
      )
  );

  const serializedOpbeansJavaInternalOnlyEvents = Array.from(opbeansJavaInternalOnlyEvents).flatMap(
    (event) => event.serialize()
  );

  return range
    .interval('1s')
    .rate(1)
    .generator((timestamp) => [
      opbeansJava
        .transaction({ transactionName: 'GET /api/product' })
        .timestamp(timestamp)
        .duration(1000)
        .failure()
        .errors(
          opbeansJava.error({ message: '[MockError] Foo', type: `Exception` }).timestamp(timestamp)
        )
        .children(
          opbeansJava
            .span({
              spanName: 'SELECT * FROM product',
              spanType: 'db',
              spanSubtype: 'postgresql',
            })
            .timestamp(timestamp)
            .duration(50)
            .failure()
            .destination('postgresql'),
          opbeansJava
            .span({ spanName: 'Span B', spanType: 'messaging', spanSubtype: 'kafka' })
            .defaults({
              'span.links': shuffle([
                ...generateExternalSpanLinks(),
                ...getSpanLinksFromEvents(serializedOpbeansJavaInternalOnlyEvents),
              ]),
            })
            .timestamp(timestamp)
            .duration(900)
        ),
      opbeansNode
        .transaction({ transactionName: 'GET /api/product/:id' })
        .timestamp(timestamp)
        .duration(500)
        .success(),
      opbeansNode
        .transaction({
          transactionName: 'Worker job',
          transactionType: 'Worker',
        })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
      opbeansRum.transaction({ transactionName: '/' }).timestamp(timestamp).duration(1000),
    ]);
}
