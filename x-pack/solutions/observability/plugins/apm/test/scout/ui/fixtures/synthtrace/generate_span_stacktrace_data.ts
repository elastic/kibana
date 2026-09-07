/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';
import { PRODUCTION_ENVIRONMENT } from '../constants';

export function generateSpanStacktraceData(): SynthtraceGenerator<ApmFields> {
  const apmGenerated = apm
    .service({
      name: 'apm-generated',
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'java',
    })
    .instance('instance a');

  const otelGenerated = apm
    .service({
      name: 'otel-generated',
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'java',
    })
    .instance('instance a');

  const range = timerange(
    new Date('2022-01-01T00:00:00.000Z'),
    new Date('2022-01-01T00:01:00.000Z')
  );

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => [
      apmGenerated
        .transaction({ transactionName: `Transaction A` })
        .defaults({
          'service.language.name': 'java',
        })
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .children(
          apmGenerated
            .span({
              spanName: `Span A`,
              spanType: 'internal',
              'span.stacktrace': [
                {
                  library_frame: false,
                  exclude_from_grouping: false,
                  filename: 'OutputBuffer.java',
                  classname: 'org.apache.catalina.connector.OutputBuffer',
                  line: { number: 825 },
                  module: 'org.apache.catalina.connector',
                  function: 'flushByteBuffer',
                },
              ],
            })
            .timestamp(timestamp + 50)
            .duration(100)
            .failure()
        ),
      otelGenerated
        .transaction({ transactionName: `Transaction A` })
        .timestamp(timestamp)
        .duration(1000)
        .defaults({
          'service.language.name': 'java',
        })
        .success()
        .children(
          otelGenerated
            .span({
              spanName: `Span A`,
              spanType: 'internal',
              'code.stacktrace':
                'java.lang.Throwable\n\tat co.elastic.otel.ElasticSpanProcessor.captureStackTrace(ElasticSpanProcessor.java:81)',
            })
            .timestamp(timestamp + 50)
            .duration(100)
            .failure()
        ),
    ]);
}
