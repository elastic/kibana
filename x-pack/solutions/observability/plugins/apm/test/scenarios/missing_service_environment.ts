/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates OTel traces with no service.environment (namespace omitted).
 * Use to verify UI does not crash when opening error samples, transaction/span
 * flyouts, or agent config links for data without environment.
 */

import type { ApmOtelFields, OtelInstance } from '@kbn/synthtrace-client';
import { apm, ApmSynthtracePipelineSchema } from '@kbn/synthtrace-client';
import { withClient } from '@kbn/synthtrace';
import type { Scenario } from '@kbn/synthtrace';

const scenario: Scenario<ApmOtelFields> = async (runOptions) => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const transactionName = 'oteldemo.AdServiceSynth/GetAds';

      const { logger } = runOptions;

      const edotInstance = apm
        .otelService({
          name: 'adservice-edot-synth',
          sdkLanguage: 'java',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('edot-instance');

      const otelNativeInstance = apm
        .otelService({
          name: 'sendotlp-otel-native-synth',
          sdkName: 'otlp',
          sdkLanguage: 'nodejs',
        })
        .instance('otel-native-instance');

      const successfulTimestamps = range.interval('1m').rate(180);
      const failedTimestamps = range.interval('1m').rate(40);

      const instanceSpans = (instance: OtelInstance) => {
        const successfulTraceEvents = successfulTimestamps.generator((timestamp) =>
          instance
            .span({
              name: transactionName,
              kind: 'Server',
            })
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instance
                .dbExitSpan({
                  name: 'GET apm-*/_search',
                  type: 'elasticsearch',
                })
                .duration(1000)
                .success()
                .timestamp(timestamp),
              instance
                .span({
                  name: 'custom_operation',
                  kind: 'Internal',
                })
                .duration(100)
                .success()
                .timestamp(timestamp)
            )
        );

        const failedTraceEvents = failedTimestamps.generator((timestamp) =>
          instance
            .span({ name: transactionName, kind: 'Server' })
            .timestamp(timestamp)
            .duration(1000)
            .failure()
            .errors(
              instance
                .error({
                  message: '[ResponseError] index_not_found_exception',
                  type: 'ResponseError',
                })
                .timestamp(timestamp + 50)
            )
        );

        return [successfulTraceEvents, failedTraceEvents];
      };

      return [
        withClient(
          apmEsClient,
          logger.perf('generating_otel_trace', () =>
            [otelNativeInstance, edotInstance].flatMap((instance) => instanceSpans(instance))
          )
        ),
      ];
    },
    setupPipeline: ({ apmEsClient }) => {
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel));
    },
  };
};

export default scenario;
