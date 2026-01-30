/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, timerange } from '@kbn/synthtrace-client';
import {
  SERVICE_OPBEANS_JAVA,
  SERVICE_OPBEANS_NODE,
  OPBEANS_JAVA_INSTANCE,
  PRODUCTION_ENVIRONMENT,
  DEPENDENCY_POSTGRESQL,
} from '../constants';

export function opbeans({ from, to }: { from: number; to: number }) {
  const range = timerange(from, to);

  const opbeansJava = apm
    .service({ name: SERVICE_OPBEANS_JAVA, environment: PRODUCTION_ENVIRONMENT, agentName: 'java' })
    .instance(OPBEANS_JAVA_INSTANCE);

  const opbeansNode = apm
    .service({ name: SERVICE_OPBEANS_NODE, environment: PRODUCTION_ENVIRONMENT, agentName: 'node' })
    .instance('opbeans-node-prod-1');

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => [
      opbeansJava
        .transaction({ transactionName: 'GET /api/product/:id' })
        .duration(1000)
        .timestamp(timestamp)
        .children(
          opbeansJava
            .span({
              spanName: 'GET opbeans-node',
              spanType: 'external',
              spanSubtype: 'http',
            })
            .destination('opbeans-node')
            .duration(500)
            .timestamp(timestamp),
          // Add a database dependency
          opbeansJava
            .span({
              spanName: 'SELECT * FROM products',
              spanType: 'db',
              spanSubtype: 'postgresql',
            })
            .destination(DEPENDENCY_POSTGRESQL)
            .duration(50)
            .timestamp(timestamp)
        ),
      opbeansNode
        .transaction({ transactionName: 'GET /api/product' })
        .duration(500)
        .timestamp(timestamp),
    ]);
}
