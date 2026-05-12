/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';
import {
  SERVICE_MAP_TEST_SERVICE,
  SERVICE_MAP_TEST_ENVIRONMENT_PRODUCTION,
  SERVICE_MAP_TEST_ENVIRONMENT_STAGING,
  SERVICE_MAP_TEST_ENVIRONMENT_DEVELOPMENT,
} from '../constants';

export function serviceMapMultiEnv({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const range = timerange(from, to);

  const serviceProduction = apm
    .service({
      name: SERVICE_MAP_TEST_SERVICE,
      environment: SERVICE_MAP_TEST_ENVIRONMENT_PRODUCTION,
      agentName: 'nodejs',
    })
    .instance('service-map-test-prod-1');

  const serviceStaging = apm
    .service({
      name: SERVICE_MAP_TEST_SERVICE,
      environment: SERVICE_MAP_TEST_ENVIRONMENT_STAGING,
      agentName: 'nodejs',
    })
    .instance('service-map-test-staging-1');

  const serviceDevelopment = apm
    .service({
      name: SERVICE_MAP_TEST_SERVICE,
      environment: SERVICE_MAP_TEST_ENVIRONMENT_DEVELOPMENT,
      agentName: 'nodejs',
    })
    .instance('service-map-test-dev-1');

  // Downstream services that service-map-test calls in staging
  const stagingBackend = apm
    .service({
      name: 'staging-backend',
      environment: SERVICE_MAP_TEST_ENVIRONMENT_STAGING,
      agentName: 'java',
    })
    .instance('staging-backend-1');

  const stagingCache = apm
    .service({
      name: 'staging-cache',
      environment: SERVICE_MAP_TEST_ENVIRONMENT_STAGING,
      agentName: 'go',
    })
    .instance('staging-cache-1');

  return range
    .interval('1s')
    .rate(1)
    .generator((timestamp) => [
      serviceProduction
        .transaction({ transactionName: 'GET /api/production' })
        .timestamp(timestamp)
        .duration(100)
        .success(),
      // Staging: service-map-test calls staging-backend and staging-cache, plus hits a database
      serviceStaging
        .transaction({ transactionName: 'GET /api/staging' })
        .timestamp(timestamp)
        .duration(150)
        .success()
        .children(
          serviceStaging
            .span({ spanName: 'GET staging-backend', spanType: 'external', spanSubtype: 'http' })
            .timestamp(timestamp + 10)
            .duration(50)
            .success()
            .destination('staging-backend')
            .children(
              stagingBackend
                .transaction({ transactionName: 'POST /process' })
                .timestamp(timestamp + 10)
                .duration(40)
                .success()
            ),
          serviceStaging
            .span({ spanName: 'GET staging-cache', spanType: 'external', spanSubtype: 'http' })
            .timestamp(timestamp + 70)
            .duration(30)
            .success()
            .destination('staging-cache')
            .children(
              stagingCache
                .transaction({ transactionName: 'GET /cache/key' })
                .timestamp(timestamp + 70)
                .duration(20)
                .success()
            ),
          serviceStaging
            .span({ spanName: 'SELECT * FROM orders', spanType: 'db', spanSubtype: 'postgresql' })
            .timestamp(timestamp + 110)
            .duration(25)
            .success()
            .destination('postgresql')
        ),
      serviceDevelopment
        .transaction({ transactionName: 'GET /api/development' })
        .timestamp(timestamp)
        .duration(200)
        .success(),
    ]);
}
