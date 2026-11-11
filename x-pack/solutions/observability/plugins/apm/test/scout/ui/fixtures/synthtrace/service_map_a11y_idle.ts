/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';
import {
  PRODUCTION_ENVIRONMENT,
  SERVICE_MAP_A11Y_BUSY,
  SERVICE_MAP_A11Y_QUIET,
} from '../constants';

/**
 * Two services for idle-fade a11y checks: a busy caller and a quiet callee.
 * Quiet throughput is well under a tenth of the pair's median, so it fades when
 * node stats are on.
 */
export function serviceMapA11yIdle({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const busy = apm
    .service({
      name: SERVICE_MAP_A11Y_BUSY,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'nodejs',
    })
    .instance('map-a11y-busy-1');
  const quiet = apm
    .service({
      name: SERVICE_MAP_A11Y_QUIET,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'java',
    })
    .instance('map-a11y-quiet-1');

  const repeat = <T>(count: number, create: () => T): T[] => Array.from({ length: count }, create);

  return timerange(from, to)
    .interval('1m')
    .rate(1)
    .generator((timestamp, index) => {
      const events = [
        busy
          .transaction({ transactionName: 'GET /busy' })
          .timestamp(timestamp)
          .duration(100)
          .success()
          .children(
            busy
              .span({
                spanName: `GET ${SERVICE_MAP_A11Y_QUIET}`,
                spanType: 'external',
                spanSubtype: 'http',
              })
              .timestamp(timestamp + 10)
              .duration(40)
              .success()
              .destination(SERVICE_MAP_A11Y_QUIET)
          ),
        ...repeat(59, () =>
          busy
            .transaction({ transactionName: 'GET /busy' })
            .timestamp(timestamp)
            .duration(100)
            .success()
        ),
      ];

      // One quiet transaction every 10 minutes → ~0.1/m vs busy ~60/m.
      if (index % 10 === 0) {
        events.push(
          quiet
            .transaction({ transactionName: 'GET /quiet' })
            .timestamp(timestamp)
            .duration(50)
            .success()
        );
      }

      return events;
    });
}
