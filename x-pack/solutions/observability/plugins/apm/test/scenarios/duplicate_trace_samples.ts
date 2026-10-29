/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Emits pairs of OTel transaction documents that share the same trace_id and
 * span_id (transaction.id), one with gen_ai.* attributes and one without.
 *
 * Used to manually test trace-sample pagination on the APM transaction details
 * page when several samples share traceId + transactionId.
 *
 * Usage:
 *   node scripts/synthtrace duplicate_trace_samples --live
 *   (or with --from/--to for a fixed range)
 *
 * Then open service `duplicate-samples-service` > Transactions >
 * `POST /v1/chat/completions` and page through the trace samples.
 */

import {
  apm,
  ApmSynthtracePipelineSchema,
  generateLongId,
  generateShortId,
} from '@kbn/synthtrace-client';
import type { ApmOtelFields } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const TRANSACTION_NAME = 'POST /v1/chat/completions';

const scenario: Scenario<ApmOtelFields> = async () => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const instance = apm
        .otelService({
          name: 'duplicate-samples-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('duplicate-samples-instance-1');

      const duplicatedSpans = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) => {
          const traceId = generateLongId();
          const spanId = generateShortId();

          const buildSpan = (offsetMs: number) =>
            instance
              .span({ name: TRANSACTION_NAME, kind: 'Server' })
              .timestamp(timestamp + offsetMs)
              .duration(1500)
              .success();

          // Same trace_id + span_id (transaction.id) for both documents.
          const withGenAi = buildSpan(0).overrides({
            trace_id: traceId,
            span_id: spanId,
            'attributes.http.request.method': 'POST',
            'attributes.url.path': '/v1/chat/completions',
            'attributes.http.response.status_code': 200,
            'attributes.gen_ai.operation.name': 'chat',
            'attributes.gen_ai.system': 'openai',
            'attributes.gen_ai.provider.name': 'openai',
            'attributes.gen_ai.request.model': 'gpt-4o',
            'attributes.gen_ai.response.model': 'gpt-4o-2024-08-06',
            'attributes.gen_ai.usage.input_tokens': 100,
            'attributes.gen_ai.usage.output_tokens': 50,
          });

          const withoutGenAi = buildSpan(1).overrides({
            trace_id: traceId,
            span_id: spanId,
            'attributes.http.request.method': 'POST',
            'attributes.url.path': '/v1/chat/completions',
            'attributes.http.response.status_code': 200,
          });

          return [withGenAi, withoutGenAi];
        });

      return [withClient(apmEsClient, duplicatedSpans)];
    },
    setupPipeline: ({ apmEsClient }) => {
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel));
    },
  };
};

export default scenario;
