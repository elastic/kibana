/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange, generateLongId, generateShortId } from '@kbn/synthtrace-client';
import { shuffle, compact } from 'lodash';
import type { SpanLink } from '@kbn/apm-types/es_schemas_raw';
import {
  ERROR_MESSAGE,
  PRODUCT_TRANSACTION_NAME,
  PRODUCT_BY_ID_TRANSACTION_NAME,
  SERVICE_OPBEANS_JAVA,
  SERVICE_OPBEANS_NODE,
  SERVICE_OPBEANS_RUM,
  SERVICE_GO,
  SERVICE_NODE,
  OPBEANS_JAVA_INSTANCE,
  PRODUCTION_ENVIRONMENT,
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
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'java',
    })
    .instance(OPBEANS_JAVA_INSTANCE)
    .podId(`${OPBEANS_JAVA_INSTANCE}-pod`);

  const opbeansNode = apm
    .service({
      name: SERVICE_OPBEANS_NODE,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'nodejs',
    })
    .instance('opbeans-node-prod-1');

  const opbeansRum = apm.browser({
    serviceName: SERVICE_OPBEANS_RUM,
    environment: PRODUCTION_ENVIRONMENT,
    userAgent: apm.getChromeUserAgentDefaults(),
  });

  const opbeansGo = apm
    .service({
      name: SERVICE_GO,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'go',
    })
    .instance('service-go-prod-1');

  const serviceNode = apm
    .service({
      name: SERVICE_NODE,
      environment: PRODUCTION_ENVIRONMENT,
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

  // Pre-shuffle once to avoid expensive shuffle operations in the generator callback
  let shuffledSpanLinks: SpanLink[] | null = null;
  const getShuffledSpanLinks = () => {
    if (shuffledSpanLinks === null) {
      const events: ApmFields[] = [];
      let count = 0;
      const maxEvents = 10; // Reduced from 100 to minimize memory usage
      for (const event of opbeansJavaInternalOnlyEvents) {
        events.push(...event.serialize());
        count++;
        if (count >= maxEvents) {
          break;
        }
      }
      const spanLinksFromEvents = getSpanLinksFromEvents(events);
      shuffledSpanLinks = shuffle([...generateExternalSpanLinks(), ...spanLinksFromEvents]);
    }
    return shuffledSpanLinks;
  };

  // Pre-compute Go transaction builders
  const goTransactionBuilders = SERVICE_GO_TRANSACTION_NAMES.map((transactionName) => ({
    transactionName,
    build: (timestamp: number) =>
      opbeansGo
        .transaction({
          transactionName,
          transactionType: 'request',
        })
        .timestamp(timestamp)
        .duration(500)
        .success(),
  }));

  // Sample Go transactions: generate only 4 per second (rotating through all 40 over time)
  // This reduces volume by 90% while still covering all transaction types
  const GO_TRANSACTIONS_PER_SECOND = 4;

  return range
    .interval('1s')
    .rate(1)
    .generator((timestamp, index) => {
      // Rotate through Go transactions: generate 4 different ones each second
      const goStartIndex = (index * GO_TRANSACTIONS_PER_SECOND) % goTransactionBuilders.length;
      const selectedGoTransactions = goTransactionBuilders.slice(
        goStartIndex,
        goStartIndex + GO_TRANSACTIONS_PER_SECOND
      );
      // If we're near the end, wrap around
      const remaining = GO_TRANSACTIONS_PER_SECOND - selectedGoTransactions.length;
      if (remaining > 0) {
        selectedGoTransactions.push(...goTransactionBuilders.slice(0, remaining));
      }

      return [
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
                'span.links': getShuffledSpanLinks(),
              })
              .timestamp(timestamp)
              .duration(900)
          ),
        opbeansNode
          .transaction({ transactionName: PRODUCT_BY_ID_TRANSACTION_NAME })
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
        ...selectedGoTransactions.map((builder) => builder.build(timestamp)),
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
      ];
    });
}
