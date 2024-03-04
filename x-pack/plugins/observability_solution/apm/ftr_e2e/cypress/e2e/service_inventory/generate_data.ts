/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';

export function generateMultipleServicesData({
  from,
  to,
}: {
  from: number;
  to: number;
}) {
  const range = timerange(from, to);

  const services = Array(50)
    .fill(0)
    .map((_, idx) =>
      apm
        .service({
          name: `${idx}`,
          environment: 'production',
          agentName: 'nodejs',
        })
        .instance('opbeans-node-prod-1')
    );

  return range
    .interval('2m')
    .rate(1)
    .generator((timestamp, index) =>
      services.map((service) =>
        service
          .transaction({ transactionName: 'GET /foo' })
          .timestamp(timestamp)
          .duration(500)
          .success()
      )
    );
}
