/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';
import { ERROR_MESSAGE, PRODUCT_TRANSACTION_NAME } from '../constants';

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

export function opbeans({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const range = timerange(from, to);

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

  const opbeansGo = apm
    .service({
      name: 'service-go',
      environment: 'production',
      agentName: 'go',
    })
    .instance('service-go-prod-1');

  const serviceNode = apm
    .service({
      name: 'service-node',
      environment: 'production',
      agentName: 'nodejs',
    })
    .instance('service-node-prod-1');

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
            .destination('postgresql')
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
