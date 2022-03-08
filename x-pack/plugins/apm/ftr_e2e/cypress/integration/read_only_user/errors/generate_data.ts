/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@elastic/apm-synthtrace';

export function generateData({ from, to }: { from: number; to: number }) {
  const range = timerange(from, to);

  const opbeansJava = apm
    .service('opbeans-java', 'production', 'java')
    .instance('opbeans-java-prod-1')
    .podId('opbeans-java-prod-1-pod');

  const opbeansNode = apm
    .service('opbeans-node', 'production', 'nodejs')
    .instance('opbeans-node-prod-1');

  return range
    .interval('2m')
    .rate(1)
    .spans((timestamp, index) => [
      ...opbeansJava
        .transaction('GET /apple 🍎 ')
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .errors(
          opbeansJava
            .error(`Error ${index}`, `exception ${index}`)
            .timestamp(timestamp)
        )
        .serialize(),
      ...opbeansNode
        .transaction('GET /banana 🍌')
        .timestamp(timestamp)
        .duration(500)
        .success()
        .serialize(),
    ]);
}
