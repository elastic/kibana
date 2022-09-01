/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace';

export function generateData({ from, to }: { from: number; to: number }) {
  const range = timerange(from, to);
  const serviceRunsInContainerInstance = apm
    .service('synth-go', 'production', 'go')
    .instance('instance-a');

  const serviceInstance = apm
    .service('synth-java', 'production', 'java')
    .instance('instance-b');

  const serviceNoInfraDataInstance = apm
    .service('synth-node', 'production', 'node')
    .instance('instance-b');

  return range.interval('1m').generator((timestamp) => {
    return [
      serviceRunsInContainerInstance
        .transaction('GET /apple 🍎')
        .defaults({
          'container.id': 'foo',
          'host.hostname': 'bar',
          'kubernetes.pod.name': 'baz',
        })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
      serviceInstance
        .transaction('GET /banana 🍌')
        .defaults({
          'host.hostname': 'bar',
        })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
      serviceNoInfraDataInstance
        .transaction('GET /banana 🍌')
        .timestamp(timestamp)
        .duration(1000)
        .success(),
    ];
  });
}
