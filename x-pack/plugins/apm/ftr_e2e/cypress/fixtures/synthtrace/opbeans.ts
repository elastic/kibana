/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  service,
  browser,
  timerange,
  getChromeUserAgentDefaults,
} from '@elastic/apm-synthtrace';

export function opbeans({ from, to }: { from: number; to: number }) {
  const range = timerange(from, to);

  const opbeansJava = service('opbeans-java', 'production', 'java')
    .instance('opbeans-java-prod-1')
    .podId('opbeans-java-prod-1-pod');

  const opbeansNode = service('opbeans-node', 'production', 'nodejs').instance(
    'opbeans-node-prod-1'
  );

  const opbeansRum = browser(
    'opbeans-rum',
    'production',
    getChromeUserAgentDefaults()
  );

  return [
    ...range
      .interval('1s')
      .rate(1)
      .flatMap((timestamp) => [
        ...opbeansJava
          .transaction('GET /api/product')
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .errors(opbeansJava.error('[MockError] Foo').timestamp(timestamp))
          .children(
            opbeansJava
              .span('SELECT * FROM product', 'db', 'postgresql')
              .timestamp(timestamp)
              .duration(50)
              .success()
              .destination('postgresql')
          )
          .serialize(),
        ...opbeansNode
          .transaction('GET /api/product/:id')
          .timestamp(timestamp)
          .duration(500)
          .success()
          .serialize(),
        ...opbeansNode
          .transaction('Worker job', 'Worker')
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .serialize(),
        ...opbeansRum
          .transaction('/')
          .timestamp(timestamp)
          .duration(1000)
          .serialize(),
      ]),
  ];
}
