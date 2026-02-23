/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';

export function infrastructureData({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const range = timerange(from, to);
  const serviceRunsInContainerInstance = apm
    .service({ name: 'synth-go', environment: 'production', agentName: 'go' })
    .instance('instance-a');

  const serviceInstance = apm
    .service({
      name: 'synth-java',
      environment: 'production',
      agentName: 'java',
    })
    .instance('instance-b');

  const serviceNoInfraDataInstance = apm
    .service({
      name: 'synth-node',
      environment: 'production',
      agentName: 'node',
    })
    .instance('instance-b');

  return range.interval('1m').generator((timestamp) => {
    return [
      serviceRunsInContainerInstance
        .transaction({ transactionName: 'GET /apple 🍎' })
        .defaults({
          'container.id': 'foo',
          'host.name': 'bar',
          'kubernetes.pod.name': 'baz',
        })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
      serviceInstance
        .transaction({ transactionName: 'GET /banana 🍌' })
        .defaults({
          'host.name': 'bar',
        })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
      serviceNoInfraDataInstance
        .transaction({ transactionName: 'GET /banana 🍌' })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
    ];
  });
}
