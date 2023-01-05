/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';

export function generateData({
  from,
  to,
  specialServiceName,
}: {
  from: number;
  to: number;
  specialServiceName: string;
}) {
  const range = timerange(from, to);

  const service1 = apm
    .service({
      name: specialServiceName,
      environment: 'production',
      agentName: 'java',
    })
    .instance('service-1-prod-1')
    .podId('service-1-prod-1-pod');

  const opbeansNode = apm
    .service({
      name: 'opbeans-node',
      environment: 'production',
      agentName: 'nodejs',
    })
    .instance('opbeans-node-prod-1');

  return range
    .interval('2m')
    .rate(1)
    .generator((timestamp) => [
      service1
        .transaction({ transactionName: 'GET /apple 🍎 ' })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
      opbeansNode
        .transaction({ transactionName: 'GET /banana 🍌' })
        .timestamp(timestamp)
        .duration(500)
        .success(),
    ]);
}
