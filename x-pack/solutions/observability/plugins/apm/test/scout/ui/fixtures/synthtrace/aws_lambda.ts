/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';
import { SERVICE_AWS_LAMBDA, PRODUCTION_ENVIRONMENT } from '../constants';

export function awsLambda({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const instance = apm
    .service({
      name: SERVICE_AWS_LAMBDA,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'python',
    })
    .instance('instance-a');

  return timerange(from, to)
    .interval('1m')
    .rate(10)
    .generator((timestamp) =>
      instance
        .transaction({ transactionName: 'GET /apple 🍎' })
        .defaults({
          'service.runtime.name': 'AWS_Lambda_python3.8',
          'cloud.provider': 'aws',
          'cloud.service.name': 'lambda',
          'faas.coldstart': true,
        })
        .timestamp(timestamp)
        .duration(1000)
        .success()
    );
}
