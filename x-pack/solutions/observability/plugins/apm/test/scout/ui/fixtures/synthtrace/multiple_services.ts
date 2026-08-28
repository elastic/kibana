/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';
import { MULTIPLE_SERVICES_PREFIX, PRODUCTION_ENVIRONMENT } from '../constants';

// Generates a large batch of identical services used to exercise service
// inventory pagination. Names are prefixed so they can be filtered without
// colliding with the opbeans services in the shared lane.
export function generateMultipleServicesData(
  { from, to }: { from: number; to: number },
  quantity = 50
): SynthtraceGenerator<ApmFields> {
  const range = timerange(from, to);

  const services = Array(quantity)
    .fill(0)
    .map((_, idx) =>
      apm
        .service({
          name: `${MULTIPLE_SERVICES_PREFIX}${idx}`,
          environment: PRODUCTION_ENVIRONMENT,
          agentName: 'nodejs',
        })
        .instance('multi-service-instance')
    );

  return range
    .interval('2m')
    .rate(1)
    .generator((timestamp) =>
      services.map((service) =>
        service
          .transaction({ transactionName: 'GET /foo' })
          .timestamp(timestamp)
          .duration(500)
          .success()
      )
    );
}
