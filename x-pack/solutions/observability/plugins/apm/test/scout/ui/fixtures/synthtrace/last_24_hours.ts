/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmFields, SynthtraceGenerator } from '@kbn/apm-synthtrace-client';
import { apm, timerange } from '@kbn/apm-synthtrace-client';

export function servicesDataFromTheLast24Hours(): SynthtraceGenerator<ApmFields> {
  const start = Date.now() - 1000 * 60 * 15;
  const end = Date.now();
  const range = timerange(new Date(start).getTime(), new Date(end).getTime());
  const synthGo1 = apm
    .service({
      name: 'synth-go-1',
      environment: 'production',
      agentName: 'go',
    })
    .instance('my-instance');
  const synthGo2 = apm
    .service({ name: 'synth-go-2', environment: 'production', agentName: 'go' })
    .instance('my-instance');
  const synthNode = apm
    .service({
      name: 'synth-node-1',
      environment: 'production',
      agentName: 'nodejs',
    })
    .instance('my-instance');

  return range.interval('1m').generator((timestamp) => {
    return [
      synthGo1
        .transaction({ transactionName: 'GET /apple 🍎' })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
      synthGo2
        .transaction({ transactionName: 'GET /banana 🍌' })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
      synthNode
        .transaction({ transactionName: 'GET /apple 🍎' })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
    ];
  });
}
