/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';

const dataConfig = {
  serviceName: 'synth-python',
  rate: 10,
  transaction: {
    name: 'GET /apple 🍎',
    duration: 1000,
  },
};

export function generateData({ start, end }: { start: number; end: number }) {
  const { rate, transaction, serviceName } = dataConfig;
  const instance = apm
    .service({
      name: serviceName,
      environment: 'production',
      agentName: 'python',
    })
    .instance('instance-a');

  const traceEvents = timerange(start, end)
    .interval('1m')
    .rate(rate)
    .generator((timestamp) =>
      instance
        .transaction({ transactionName: transaction.name })
        .defaults({
          'service.runtime.name': 'AWS_Lambda_python3.8',
          'cloud.provider': 'aws',
          'cloud.service.name': 'lambda',
          'faas.coldstart': true,
        })
        .timestamp(timestamp)
        .duration(transaction.duration)
        .success()
    );

  return traceEvents;
}
