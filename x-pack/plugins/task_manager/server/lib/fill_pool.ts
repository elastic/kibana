/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { concatMap, last } from 'rxjs/operators';
import { ClaimOwnershipResult } from '../queries/task_claiming';
import { ConcreteTaskInstance } from '../task';
import { WithTaskTiming, startTaskTimer } from '../task_events';
import { TaskPoolRunResult } from '../task_pool';
import { TaskManagerRunner } from '../task_running';
import { Result, map as mapResult, asErr, asOk } from './result_type';

export enum FillPoolResult {
  Failed = 'Failed',
  NoAvailableWorkers = 'NoAvailableWorkers',
  NoTasksClaimed = 'NoTasksClaimed',
  RunningAtCapacity = 'RunningAtCapacity',
  RanOutOfCapacity = 'RanOutOfCapacity',
  PoolFilled = 'PoolFilled',
}

type FillPoolAndRunResult = Result<
  {
    result: TaskPoolRunResult;
    stats?: ClaimOwnershipResult['stats'];
  },
  {
    result: FillPoolResult;
    stats?: ClaimOwnershipResult['stats'];
  }
>;

export type ClaimAndFillPoolResult = Partial<Pick<ClaimOwnershipResult, 'stats'>> & {
  result: FillPoolResult;
};
export type TimedFillPoolResult = WithTaskTiming<ClaimAndFillPoolResult>;

/**
 * Given a function that runs a batch of tasks (e.g. taskPool.run), a function
 * that fetches task records (e.g. store.fetchAvailableTasks), and a function
 * that converts task records to the appropriate task runner, this function
 * fills the pool with work.
 *
 * This is annoyingly general in order to simplify testing.
 *
 * @param run - a function that runs a batch of tasks (e.g. taskPool.run)
 * @param fetchAvailableTasks - a function that fetches task records (e.g. store.fetchAvailableTasks)
 * @param converter - a function that converts task records to the appropriate task runner
 */
export async function fillPool(
  fetchAvailableTasks: () => Observable<Result<ClaimOwnershipResult, FillPoolResult>>,
  converter: (taskInstance: ConcreteTaskInstance) => TaskManagerRunner,
  run: (tasks: TaskManagerRunner[]) => Promise<TaskPoolRunResult>
): Promise<TimedFillPoolResult> {
  return new Promise((resolve, reject) => {
    const stopTaskTimer = startTaskTimer();
    const augmentTimingTo = (
      result: FillPoolResult,
      stats?: ClaimOwnershipResult['stats']
    ): TimedFillPoolResult => ({
      result,
      stats,
      timing: stopTaskTimer(),
    });
    fetchAvailableTasks()
      .pipe(
        // each ClaimOwnershipResult will be sequencially consumed an ran using the `run` handler
        concatMap(async (res) =>
          mapResult<ClaimOwnershipResult, FillPoolResult, Promise<FillPoolAndRunResult>>(
            res,
            async ({ docs, stats }) => {
              if (!docs.length) {
                return asOk({ result: TaskPoolRunResult.NoTaskWereRan, stats });
              }
              return asOk(
                await run(docs.map(converter)).then((runResult) => ({
                  result: runResult,
                  stats,
                }))
              );
            },
            async (fillPoolResult) => asErr({ result: fillPoolResult })
          )
        ),
        // when the final call to `run` completes, we'll complete the stream and emit the
        // final accumulated result
        last()
      )
      .subscribe(
        (claimResults) => {
          resolve(
            mapResult(
              claimResults,
              ({ result, stats }) => {
                switch (result) {
                  case TaskPoolRunResult.RanOutOfCapacity:
                    return augmentTimingTo(FillPoolResult.RanOutOfCapacity, stats);
                  case TaskPoolRunResult.RunningAtCapacity:
                    return augmentTimingTo(FillPoolResult.RunningAtCapacity, stats);
                  case TaskPoolRunResult.NoTaskWereRan:
                    return augmentTimingTo(FillPoolResult.NoTasksClaimed, stats);
                  default:
                    return augmentTimingTo(FillPoolResult.PoolFilled, stats);
                }
              },
              ({ result, stats }) => augmentTimingTo(result, stats)
            )
          );
        },
        (err) => reject(err)
      );
  });
}
