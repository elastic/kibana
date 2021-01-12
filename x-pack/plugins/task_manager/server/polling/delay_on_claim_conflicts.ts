/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  function pushIntoQueue(claimClashes: number): Option<number> {
    // add latest claimConflict count to queue
    claimConflictQueue(claimClashes);
    // emit value if above or equal to Threshold in orderto recompute average
    return claimClashes >= claimClashesPercentageThreshold
      ? some(stats.percentile(claimConflictQueue(), 0.5))
      : none;
  }

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
            ? pushIntoQueue(taskEvent.event.value.stats!.tasksConflicted)
            : none
        ),
        filter<Option<number>>((claimClashes) => isSome(claimClashes)),
        map((claimClashes: Option<number>) => (claimClashes as Some<number>).value)
      ),
    ]).pipe(
      filter(
        ([maxWorkers, , claimClashes]) =>
          (claimClashes * 100) / maxWorkers >= claimClashesPercentageThreshold
      ),
      map(([, pollInterval]) => random(pollInterval * 0.25, pollInterval * 0.75, false))
    )
  );
}
