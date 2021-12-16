/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@elastic/apm-synthtrace';

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
    .service(specialServiceName, 'production', 'java')
    .instance('service-1-prod-1')
    .podId('service-1-prod-1-pod');

  const opbeansNode = apm
    .service('opbeans-node', 'production', 'nodejs')
    .instance('opbeans-node-prod-1');

  return range
    .interval('2m')
    .rate(1)
    .spans((timestamp, index) => [
      ...service1
        .transaction('GET /apple 🍎 ')
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .serialize(),
      ...opbeansNode
        .transaction('GET /banana 🍌')
        .timestamp(timestamp)
        .duration(500)
        .success()
        .serialize(),
    ]);
}
