/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNone, none, some, Option, isSome } from 'fp-ts/lib/Option';
import { OpsMetrics } from 'kibana/server';
import { Observable, Subject } from 'rxjs';
import { map, reduce, share, startWith, takeUntil } from 'rxjs/operators';
import stats from 'stats-lite';
import { createRunningAveragedStat } from '../monitoring/task_run_calcultors';

// OpsMetrics emits values every 5s, so a 60 sample window gives us 5 minutes of measurements (60s / 5s * 5m)
const CPU_UTILIZATION_RUNNING_AVERAGE_WINDOW = 60;

export type CpuUtilization = number;
export type CpuUtilizationObservation = ReturnType<typeof observedCpuUtilization>;

export function observedCpuUtilization(opsMetrics$: Observable<OpsMetrics>) {
  const cup1mLoad$ = opsMetrics$.pipe(
    map((opsMetric) => opsMetric.os.load['1m']),
    share()
  );
  return () => {
    const stopSampling$ = new Subject<boolean>();
    const pendingCpuUtilization = cup1mLoad$
      .pipe(
        takeUntil(stopSampling$),
        // Keep track of the change observed in CPU utilization over time
        reduce<number, (value?: number | undefined) => number[]>(
          (changeInCpuUtilizationRunningAverage, metric) => {
            changeInCpuUtilizationRunningAverage(metric);
            console.log(`CPU LOAD=${metric}`);
            return changeInCpuUtilizationRunningAverage;
          },
          createRunningAveragedStat<number>(CPU_UTILIZATION_RUNNING_AVERAGE_WINDOW)
        ),
        // this gets called only when all values have been redued above, so it only gets called once
        map((changeInCpuUtilizationRunningAverage) => {
          // we defer the caluclation of the mean to the end
          const sampledChangeInCpuUtilization = changeInCpuUtilizationRunningAverage();
          return sampledChangeInCpuUtilization.length
            ? stats.mean(sampledChangeInCpuUtilization)
            : 0;
        })
      )
      .toPromise();
    return (): Promise<CpuUtilization> => {
      stopSampling$.next(true);
      return pendingCpuUtilization;
    };
  };
}
