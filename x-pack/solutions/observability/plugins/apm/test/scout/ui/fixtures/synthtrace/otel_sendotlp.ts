/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';
import {
  SERVICE_OTEL_SENDOTLP,
  OTEL_INSTANCE_ID,
  OTEL_TRANSACTION_NAME,
  PRODUCTION_ENVIRONMENT,
} from '../constants';

export function otelSendotlp({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const range = timerange(from, to);

  // Using regular APM service since Scout's apmSynthtraceEsClient doesn't support
  // the OTEL pipeline. The service will appear as a Go service.
  const otelService = apm
    .service({
      name: SERVICE_OTEL_SENDOTLP,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'go',
    })
    .instance(OTEL_INSTANCE_ID);

  return range
    .interval('1s')
    .rate(1)
    .generator((timestamp) => [
      otelService
        .transaction({ transactionName: OTEL_TRANSACTION_NAME })
        .timestamp(timestamp)
        .duration(15202)
        .success()
        .children(
          otelService
            .span({
              spanName: 'child1',
              spanType: 'external',
              spanSubtype: 'http',
            })
            .duration(1000)
            .success()
            .destination('foo_service-otel-native-synth')
            .timestamp(timestamp)
        ),

      otelService
        .transaction({ transactionName: OTEL_TRANSACTION_NAME })
        .timestamp(timestamp)
        .duration(1000)
        .failure()
        .errors(
          otelService
            .error({
              message: 'boom',
              type: '*errors.errorString',
            })
            .timestamp(timestamp + 50)
        ),
    ]);
}
