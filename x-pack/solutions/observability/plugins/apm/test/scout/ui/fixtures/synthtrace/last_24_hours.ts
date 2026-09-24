/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';
import {
  SERVICE_SYNTH_GO,
  SERVICE_SYNTH_GO_2,
  SERVICE_SYNTH_NODE_1,
  PRODUCTION_ENVIRONMENT,
} from '../constants';

export function servicesDataFromTheLast24Hours(): SynthtraceGenerator<ApmFields> {
  // Custom-link filter suggestions query the last ~24h (see FiltersSection in the flyout).
  // This generator used to emit only ~15m of spans (misnamed) which amplified clock/queue drift
  // vs the UI interval on slow serverless pipelines (#262047).
  const TWENTY_FOUR_H_MS = 1000 * 60 * 60 * 24;
  const range = timerange(Date.now() - TWENTY_FOUR_H_MS, Date.now());
  const synthGo1 = apm
    .service({
      name: SERVICE_SYNTH_GO,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'go',
    })
    .instance('my-instance');
  const synthGo2 = apm
    .service({
      name: SERVICE_SYNTH_GO_2,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'go',
    })
    .instance('my-instance');
  const synthNode = apm
    .service({
      name: SERVICE_SYNTH_NODE_1,
      environment: PRODUCTION_ENVIRONMENT,
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
