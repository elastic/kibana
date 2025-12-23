/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';

export const EDOT_SERVICE_NAME = 'adservice-edot-synth';
export const EDOT_INSTANCE_ID = 'da7a8507-53be-421c-8d77-984f12397213';
export const EDOT_TRANSACTION_NAME = 'oteldemo.AdServiceEdotSynth/GetAds';
export const EDOT_ERROR_MESSAGE = '[ResponseError] index_not_found_exception';

export function adserviceEdot({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const range = timerange(from, to);

  // Using regular APM service since Scout's apmSynthtraceEsClient doesn't support
  // the OTEL pipeline. The service will appear as a Java service.
  const edotService = apm
    .service({
      name: EDOT_SERVICE_NAME,
      environment: 'production',
      agentName: 'java',
    })
    .instance(EDOT_INSTANCE_ID);

  return range
    .interval('1s')
    .rate(1)
    .generator((timestamp) => [
      edotService
        .transaction({ transactionName: EDOT_TRANSACTION_NAME })
        .timestamp(timestamp)
        .duration(551)
        .failure()
        .errors(
          edotService
            .error({
              message: EDOT_ERROR_MESSAGE,
              type: 'ResponseError',
            })
            .timestamp(timestamp + 50)
        ),
    ]);
}
