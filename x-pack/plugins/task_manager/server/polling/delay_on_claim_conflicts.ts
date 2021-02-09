/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * This module contains the logic for polling the task manager index for new work.
 */

import stats from 'stats-lite';
import { isNumber, random } from 'lodash';
import { merge, of, Observable, combineLatest } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Option, none, some, isSome, Some } from 'fp-ts/lib/Option';
import { isOk } from '../lib/result_type';
import { ManagedConfiguration } from '../lib/create_managed_configuration';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { isTaskPollingCycleEvent } from '../task_events';
import { ClaimAndFillPoolResult } from '../lib/fill_pool';
import { createRunningAveragedStat } from '../monitoring/task_run_calcultors';

/**
 * Emits a delay amount in ms to apply to polling whenever the task store exceeds a threshold of claim claimClashes
 */
export function delayOnClaimConflicts(
  maxWorkersConfiguration$: ManagedConfiguration['maxWorkersConfiguration$'],
  pollIntervalConfiguration$: ManagedConfiguration['pollIntervalConfiguration$'],
  taskLifecycleEvents$: Observable<TaskLifecycleEvent>,
  claimClashesPercentageThreshold: number,
  runningAverageWindowSize: number
): Observable<number> {
  const claimConflictQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  return merge(
    of(0),
    combineLatest([
      maxWorkersConfiguration$,
      pollIntervalConfiguration$,
      taskLifecycleEvents$.pipe(
        map<TaskLifecycleEvent, Option<number>>((taskEvent: TaskLifecycleEvent) =>
          isTaskPollingCycleEvent(taskEvent) &&
          isOk<ClaimAndFillPoolResult, unknown>(taskEvent.event) &&
          isNumber(taskEvent.event.value.stats?.tasksConflicted)
            ? some(taskEvent.event.value.stats!.tasksConflicted)
            : none
        ),
        filter<Option<number>>((claimClashes) => isSome(claimClashes)),
        map((claimClashes: Option<number>) => (claimClashes as Some<number>).value)
      ),
    ]).pipe(
      map(([maxWorkers, pollInterval, latestClaimConflicts]) => {
        // add latest claimConflict count to queue
        claimConflictQueue(latestClaimConflicts);

        const emitWhenExceeds = (claimClashesPercentageThreshold * maxWorkers) / 100;
        if (
          // avoid calculating average if the new value isn't above the Threshold
          latestClaimConflicts >= emitWhenExceeds &&
          // only calculate average and emit value if above or equal to Threshold
          stats.percentile(claimConflictQueue(), 0.5) >= emitWhenExceeds
        ) {
          return some(pollInterval);
        }
        return none;
      }),
      filter<Option<number>>((pollInterval) => isSome(pollInterval)),
      map<Option<number>, number>((maybePollInterval) => {
        const pollInterval = (maybePollInterval as Some<number>).value;
        return random(pollInterval * 0.25, pollInterval * 0.75, false);
      })
    )
  );
}
