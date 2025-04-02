/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apmOtel, timerange } from '@kbn/apm-synthtrace-client';

export function sendotlp({ from, to }: { from: number; to: number }) {
  const range = timerange(from, to);
  const transactionName = 'parent-synth';
  const transactionType = 'unknown';

  const otelSendotlp = apmOtel
    .service({
      name: 'sendotlp-otel-native-synth',
      sdkName: 'otlp',
      sdkLanguage: 'go',
    })
    .instance('89117ac1-0dbf-4488-9e17-4c2c3b76943a');

  return range
    .interval('1s')
    .rate(1)
    .generator((timestamp) => [
      otelSendotlp
        .transaction({
          transactionName,
          transactionType,
        })
        .defaults({
          'attributes.transaction.result': 'HTTP 2xx',
        })
        .timestamp(timestamp)
        .duration(15202)
        .success()
        .children(
          otelSendotlp
            .span({
              spanName: 'child1',
              spanType: 'external',
              spanSubtype: 'http',
              'attributes.http.request.method': 'GET',
            })
            .duration(1000)
            .destination('foo_service-otel-native-synth:8080')
            .success()
            .timestamp(timestamp)
        ),

      otelSendotlp
        .transaction({
          transactionName,
          transactionType,
        })
        .timestamp(timestamp)
        .duration(1000)
        .failure()
        .errors(
          otelSendotlp
            .error({
              message: 'boom',
              type: '*errors.errorString',
              stackTrace: 'Error: INTERNAL: Boom',
            })
            .timestamp(timestamp + 50)
        ),
    ]);
}
