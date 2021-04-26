/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpsMetrics } from 'kibana/server';
import { Observable, Subject } from 'rxjs';
import { observedCpuUtilization } from './observed_cpu_utilization';

describe('observedCpuUtilization', () => {
  test('tracks CPU utilization as observed while sampling', async () => {
    const opsMetrics$ = new Subject<OpsMetrics>();
    const startSampling = observedCpuUtilization(opsMetrics$ as Observable<OpsMetrics>);
    const stopSampling = startSampling();

    return expect(await stopSampling()).toEqual(0);
  });

  test('returns the mean change in CPU utilization when it rises', async () => {
    const opsMetrics$ = new Subject<OpsMetrics>();
    const startSampling = observedCpuUtilization(opsMetrics$ as Observable<OpsMetrics>);
    const stopSampling = startSampling();

    opsMetrics$.next(mockOpsMetrics(10));
    opsMetrics$.next(mockOpsMetrics(12));
    opsMetrics$.next(mockOpsMetrics(14));

    // the mean change in CPU utilization was a rise of 3%
    return expect(await stopSampling()).toEqual(3);
  });

  test('returns the mean change in CPU utilization when it drops', async () => {
    const opsMetrics$ = new Subject<OpsMetrics>();
    const startSampling = observedCpuUtilization(opsMetrics$ as Observable<OpsMetrics>);
    const stopSampling = startSampling();

    opsMetrics$.next(mockOpsMetrics(10));
    opsMetrics$.next(mockOpsMetrics(8));
    opsMetrics$.next(mockOpsMetrics(6));

    // the mean change in CPU utilization was a drop of 3%
    return expect(await stopSampling()).toEqual(-3);
  });

  test('returns the mean change in CPU utilization when it both drops and rises', async () => {
    const opsMetrics$ = new Subject<OpsMetrics>();
    const startSampling = observedCpuUtilization(opsMetrics$ as Observable<OpsMetrics>);
    const stopSampling = startSampling();

    opsMetrics$.next(mockOpsMetrics(10));
    opsMetrics$.next(mockOpsMetrics(12));
    opsMetrics$.next(mockOpsMetrics(14));
    opsMetrics$.next(mockOpsMetrics(12));
    opsMetrics$.next(mockOpsMetrics(10));
    opsMetrics$.next(mockOpsMetrics(8));
    opsMetrics$.next(mockOpsMetrics(6));
    opsMetrics$.next(mockOpsMetrics(8));
    opsMetrics$.next(mockOpsMetrics(10));

    // the mean change in CPU utilization during a rise of 3% followed by a drop of 6% and another rise of 3%
    return expect(await stopSampling()).toEqual(0);
  });

  test('tracks the mean change in CPU utilization when tracked by multiple executions in parallel', async () => {
    const opsMetrics$ = new Subject<OpsMetrics>();
    const startSampling = observedCpuUtilization(opsMetrics$ as Observable<OpsMetrics>);
    const stopSampling1st = startSampling();

    opsMetrics$.next(mockOpsMetrics(10));
    opsMetrics$.next(mockOpsMetrics(12));
    opsMetrics$.next(mockOpsMetrics(14));

    const stopSampling2nd = startSampling();

    opsMetrics$.next(mockOpsMetrics(12));
    opsMetrics$.next(mockOpsMetrics(10));
    opsMetrics$.next(mockOpsMetrics(8));

    const stopSampling3rd = startSampling();

    opsMetrics$.next(mockOpsMetrics(6));

    const resultOf2ndSampling = stopSampling2nd();

    opsMetrics$.next(mockOpsMetrics(8));
    opsMetrics$.next(mockOpsMetrics(10));

    const resultOf1stSampling = stopSampling1st();
    const resultOf3rdSampling = stopSampling3rd();

    return Promise.all([
      // rise of 3 from 10 followed by a drop of 6 and another rise of 3, so mean of 0
      expect(await resultOf1stSampling).toEqual(0),
      // drop from 12 to 6, so tracked 12, then a drop of -2, -4 and -6, so mean of -4
      expect(await resultOf2ndSampling).toEqual(-4),
      // rise from 6 to 10, so tracked 6, then a rise of 2 and 4, so mean of 3
      expect(await resultOf3rdSampling).toEqual(3),
    ]);
  });
});

function mockOpsMetrics(load1m: number): OpsMetrics {
  return {
    collected_at: new Date(),
    process: {
      memory: {
        heap: {
          total_in_bytes: 100,
          used_in_bytes: 100,
          size_limit: 100,
        },
        resident_set_size_in_bytes: 50,
      },
      pid: 0,
      uptime_in_millis: 1500,
      event_loop_delay: 50,
    },
    os: {
      load: {
        '1m': load1m,
        '5m': 20,
        '15m': 30,
      },
      platform: 'darwin',
      platformRelease: 'darwin-18.6.0',
      memory: {
        total_in_bytes: 34359738368,
        free_in_bytes: 482955264,
        used_in_bytes: 33876783104,
      },
      uptime_in_millis: 78231000,
    },
    requests: { disconnects: 0, total: 0, statusCodes: {} },
    response_times: { avg_in_millis: 0, max_in_millis: 0 },
    concurrent_connections: 0,
  };
}
