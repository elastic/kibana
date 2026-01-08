/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange, generateLongId, generateShortId } from '@kbn/synthtrace-client';
import { shuffle, compact } from 'lodash';
import {
  ERROR_MESSAGE,
  PRODUCT_TRANSACTION_NAME,
  SERVICE_OPBEANS_JAVA,
  SERVICE_OPBEANS_NODE,
  SERVICE_OPBEANS_RUM,
  SERVICE_GO,
  SERVICE_NODE,
  OPBEANS_JAVA_INSTANCE,
} from '../constants';

const SERVICE_GO_TRANSACTION_NAMES = ['GET', 'PUT', 'DELETE', 'UPDATE'].flatMap((method) =>
  [
    '/cart',
    '/categories',
    '/customers',
    '/invoices',
    '/orders',
    '/payments',
    '/products',
    '/profile',
    '/reviews',
    '/users',
  ].map((resource) => `${method} ${resource}`)
);
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

export function opbeans({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const range = timerange(from, to);
  const producerTimestamps = range.ratePerMinute(1);

  const opbeansJava = apm
    .service({
      name: SERVICE_OPBEANS_JAVA,
      environment: 'production',
      agentName: 'java',
    })
    .instance(OPBEANS_JAVA_INSTANCE)
    .podId(`${OPBEANS_JAVA_INSTANCE}-pod`);

  const opbeansNode = apm
    .service({
      name: SERVICE_OPBEANS_NODE,
      environment: 'production',
      agentName: 'nodejs',
    })
    .instance('opbeans-node-prod-1');

  const opbeansRum = apm.browser({
    serviceName: SERVICE_OPBEANS_RUM,
    environment: 'production',
    userAgent: apm.getChromeUserAgentDefaults(),
  });

  const opbeansGo = apm
    .service({
      name: SERVICE_GO,
      environment: 'production',
      agentName: 'go',
    })
    .instance('service-go-prod-1');

  const serviceNode = apm
    .service({
      name: SERVICE_NODE,
      environment: 'production',
      agentName: 'nodejs',
    })
    .instance('service-node-prod-1');

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
        .transaction({ transactionName: PRODUCT_TRANSACTION_NAME })
        .timestamp(timestamp)
        .duration(1000)
        .failure()
        .errors(
          opbeansJava.error({ message: ERROR_MESSAGE, type: 'Exception' }).timestamp(timestamp)
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
      ...SERVICE_GO_TRANSACTION_NAMES.map((transactionName) =>
        opbeansGo
          .transaction({
            transactionName,
            transactionType: 'request',
          })
          .timestamp(timestamp)
          .duration(500)
          .success()
      ),
      serviceNode
        .transaction({
          transactionName: 'GET /api/users',
          transactionType: 'request',
        })
        .timestamp(timestamp)
        .duration(500)
        .success(),
      serviceNode
        .transaction({
          transactionName: 'Background job',
          transactionType: 'Worker',
        })
        .timestamp(timestamp)
        .duration(500)
        .success(),
    ]);
}
