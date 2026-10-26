/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';
import { SERVICE_AZURE_FUNCTIONS, PRODUCTION_ENVIRONMENT } from '../constants';

export function azureFunctions({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const instance = apm
    .service({
      name: SERVICE_AZURE_FUNCTIONS,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'dotnet',
    })
    .instance('instance-a');

  return timerange(from, to)
    .interval('1m')
    .rate(10)
    .generator((timestamp) =>
      instance
        .transaction({ transactionName: 'GET /apple 🍎' })
        .defaults({
          'service.runtime.name': 'dotnet-isolated',
          'cloud.provider': 'azure',
          'cloud.service.name': 'functions',
          'faas.coldstart': true,
        })
        .timestamp(timestamp)
        .duration(1000)
        .success()
    );
}
