/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';

export function opbeans({ from, to }: { from: number; to: number }) {
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

  return range
    .interval('1s')
    .rate(1)
    .generator((timestamp) => [
      opbeansJava
        .transaction({ transactionName: 'GET /api/product' })
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .errors(
          opbeansJava
            .error({ message: '[MockError] Foo', type: `Exception` })
            .timestamp(timestamp)
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
            .success()
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
      opbeansRum
        .transaction({ transactionName: '/' })
        .timestamp(timestamp)
        .duration(1000),
    ]);
}
