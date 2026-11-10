/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';

// A whole hour on its own day, apart from the metrics data, so every rollup (1m, 10m and 60m)
// covers the same transactions
export const SERVICE_MAP_STATS_START_DATE = '2021-10-11T00:00:00.000Z';
export const SERVICE_MAP_STATS_END_DATE = '2021-10-11T01:00:00.000Z';

export const SERVICE_MAP_STATS_FRONTEND = 'map-stats-frontend';
export const SERVICE_MAP_STATS_BACKEND = 'map-stats-backend';
export const SERVICE_MAP_STATS_WORKER = 'map-stats-worker';

/** Transactions per minute and durations, which the stats are checked against. */
export const SERVICE_MAP_STATS_DATA = {
  frontend: {
    // `GET /api`: successful and failed; `GET /other`: successful
    apiSuccessPerMinute: 2,
    apiFailurePerMinute: 1,
    otherPerMinute: 1,
    durationMs: 100,
  },
  backend: {
    // `request` is a default type, so it wins over the busier `custom` type
    requestPerMinute: 1,
    requestDurationMs: 50,
    customPerMinute: 3,
    customDurationMs: 10,
  },
  worker: {
    // No default type, so the busiest type is used
    jobPerMinute: 2,
    jobDurationMs: 200,
  },
} as const;

/** Three services: frontend calls backend, and worker runs on its own. */
export function serviceMapStats({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const { frontend, backend, worker } = SERVICE_MAP_STATS_DATA;

  const frontendInstance = apm
    .service({ name: SERVICE_MAP_STATS_FRONTEND, environment: 'production', agentName: 'nodejs' })
    .instance('map-stats-frontend-1');
  const backendInstance = apm
    .service({ name: SERVICE_MAP_STATS_BACKEND, environment: 'production', agentName: 'java' })
    .instance('map-stats-backend-1');
  const workerInstance = apm
    .service({ name: SERVICE_MAP_STATS_WORKER, environment: 'production', agentName: 'python' })
    .instance('map-stats-worker-1');

  const repeat = <T>(count: number, create: () => T): T[] => Array.from({ length: count }, create);

  return timerange(from, to)
    .interval('1m')
    .rate(1)
    .generator((timestamp) => [
      // One successful `GET /api` calls the backend, which gives the map a connection
      frontendInstance
        .transaction({ transactionName: 'GET /api' })
        .timestamp(timestamp)
        .duration(frontend.durationMs)
        .success()
        .children(
          frontendInstance
            .span({ spanName: 'GET map-stats-backend', spanType: 'external', spanSubtype: 'http' })
            .timestamp(timestamp + 10)
            .duration(backend.requestDurationMs)
            .success()
            .destination(SERVICE_MAP_STATS_BACKEND)
            .children(
              ...repeat(backend.requestPerMinute, () =>
                backendInstance
                  .transaction({ transactionName: 'POST /process' })
                  .timestamp(timestamp + 10)
                  .duration(backend.requestDurationMs)
                  .success()
              )
            )
        ),
      ...repeat(frontend.apiSuccessPerMinute - 1, () =>
        frontendInstance
          .transaction({ transactionName: 'GET /api' })
          .timestamp(timestamp)
          .duration(frontend.durationMs)
          .success()
      ),
      ...repeat(frontend.apiFailurePerMinute, () =>
        frontendInstance
          .transaction({ transactionName: 'GET /api' })
          .timestamp(timestamp)
          .duration(frontend.durationMs)
          .failure()
      ),
      ...repeat(frontend.otherPerMinute, () =>
        frontendInstance
          .transaction({ transactionName: 'GET /other' })
          .timestamp(timestamp)
          .duration(frontend.durationMs)
          .success()
      ),
      ...repeat(backend.customPerMinute, () =>
        backendInstance
          .transaction({ transactionName: 'consume', transactionType: 'custom' })
          .timestamp(timestamp)
          .duration(backend.customDurationMs)
          .success()
      ),
      ...repeat(worker.jobPerMinute, () =>
        workerInstance
          .transaction({ transactionName: 'run', transactionType: 'job' })
          .timestamp(timestamp)
          .duration(worker.jobDurationMs)
          .success()
      ),
    ]);
}
