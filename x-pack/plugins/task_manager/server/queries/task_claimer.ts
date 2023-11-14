/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * This module contains helpers for managing the task manager storage layer.
 */
import apm from 'elastic-apm-node';
import minimatch from 'minimatch';
import { Subject, Observable, from, of } from 'rxjs';
import { mergeScan } from 'rxjs/operators';
import { groupBy, pick, isPlainObject } from 'lodash';

import { Logger } from '@kbn/core/server';

import { asOk } from '../lib/result_type';
import { ConcreteTaskInstance } from '../task';
import { TaskClaim, asTaskClaimEvent, startTaskTimer, TaskTiming } from '../task_events';
import { shouldBeOneOf, mustBeAllOf, filterDownBy, matchesClauses } from './query_clauses';

import {
  updateFieldsAndMarkAsFailed,
  IdleTaskWithExpiredRunAt,
  InactiveTasks,
  RunningOrClaimingTaskWithExpiredRetryAt,
  SortByRunAtAndRetryAt,
  tasksClaimedByOwner,
  tasksOfType,
  EnabledTask,
} from './mark_available_tasks_as_claimed';
import { TaskTypeDictionary } from '../task_type_dictionary';
import {
  correctVersionConflictsForContinuation,
  TaskStore,
  UpdateByQueryResult,
  SearchOpts,
} from '../task_store';
import { TASK_MANAGER_TRANSACTION_TYPE } from '../task_running';

import { TaskClaimingBatches } from './task_claiming';

export interface TaskClaimingOpts {
  logger: Logger;
  definitions: TaskTypeDictionary;
  unusedTypes: string[];
  taskStore: TaskStore;
  maxAttempts: number;
  excludedTaskTypes: string[];
  getCapacity: (taskType?: string) => number;
}

export interface OwnershipClaimingOpts {
  claimOwnershipUntil: Date;
  size: number;
  taskTypes: Set<string>;
  taskStore: TaskStore;
  events$: Subject<TaskClaim>;
  definitions: TaskTypeDictionary;
  unusedTypes: string[];
  excludedTaskTypes: string[];
  taskMaxAttempts: Record<string, number>;
}
export type IncrementalOwnershipClaimingOpts = OwnershipClaimingOpts & {
  precedingQueryResult: UpdateByQueryResult;
};
export type IncrementalOwnershipClaimingReduction = (
  opts: IncrementalOwnershipClaimingOpts
) => Promise<UpdateByQueryResult>;

export interface FetchResult {
  docs: ConcreteTaskInstance[];
}

export interface ClaimOwnershipResult {
  stats: {
    tasksUpdated: number;
    tasksConflicted: number;
    tasksClaimed: number;
  };
  docs: ConcreteTaskInstance[];
  timing?: TaskTiming;
}
export const isClaimOwnershipResult = (result: unknown): result is ClaimOwnershipResult =>
  isPlainObject((result as ClaimOwnershipResult).stats) &&
  Array.isArray((result as ClaimOwnershipResult).docs);

enum BatchConcurrency {
  Unlimited,
  Limited,
}

interface TaskClaimingBatch<Concurrency extends BatchConcurrency, TaskType> {
  concurrency: Concurrency;
  tasksTypes: TaskType;
}
type LimitedBatch = TaskClaimingBatch<BatchConcurrency.Limited, string>;

export const TASK_MANAGER_MARK_AS_CLAIMED = 'mark-available-tasks-as-claimed';

export interface TaskClaimerOpts {
  getCapacity: (taskType?: string | undefined) => number;
  claimOwnershipUntil: Date;
  batches: TaskClaimingBatches;
  events$: Subject<TaskClaim>;
  taskStore: TaskStore;
  definitions: TaskTypeDictionary;
  unusedTypes: string[];
  excludedTaskTypes: string[];
  taskMaxAttempts: Record<string, number>;
}
export function claimAvailableTasksImpl(opts: TaskClaimerOpts): Observable<ClaimOwnershipResult> {
  const { getCapacity, claimOwnershipUntil, batches, events$, taskStore } = opts;
  const { definitions, unusedTypes, excludedTaskTypes, taskMaxAttempts } = opts;
  const initialCapacity = getCapacity();
  return from(batches).pipe(
    mergeScan(
      (accumulatedResult, batch) => {
        const stopTaskTimer = startTaskTimer();
        const capacity = Math.min(
          initialCapacity - accumulatedResult.stats.tasksClaimed,
          isLimited(batch) ? getCapacity(batch.tasksTypes) : getCapacity()
        );
        // if we have no more capacity, short circuit here
        if (capacity <= 0) {
          return of(accumulatedResult);
        }
        return from(
          executeClaimAvailableTasks({
            claimOwnershipUntil,
            size: capacity,
            events$,
            taskTypes: isLimited(batch) ? new Set([batch.tasksTypes]) : batch.tasksTypes,
            taskStore,
            definitions,
            unusedTypes,
            excludedTaskTypes,
            taskMaxAttempts,
          }).then((result) => {
            const { stats, docs } = accumulateClaimOwnershipResults(accumulatedResult, result);
            stats.tasksConflicted = correctVersionConflictsForContinuation(
              stats.tasksClaimed,
              stats.tasksConflicted,
              initialCapacity
            );
            return { stats, docs, timing: stopTaskTimer() };
          })
        );
      },
      // initialise the accumulation with no results
      accumulateClaimOwnershipResults(),
      // only run one batch at a time
      1
    )
  );
}

async function executeClaimAvailableTasks(
  opts: OwnershipClaimingOpts
): Promise<ClaimOwnershipResult> {
  const { taskStore, size, taskTypes, events$ } = opts;
  const { updated: tasksUpdated, version_conflicts: tasksConflicted } =
    await markAvailableTasksAsClaimed(opts);

  const docs = tasksUpdated > 0 ? await sweepForClaimedTasks(taskStore, taskTypes, size) : [];

  emitEvents(
    events$,
    docs.map((doc) => asTaskClaimEvent(doc.id, asOk(doc)))
  );

  const stats = {
    tasksUpdated,
    tasksConflicted,
    tasksClaimed: docs.length,
  };

  return {
    stats,
    docs,
  };
}

function emitEvents(events$: Subject<TaskClaim>, events: TaskClaim[]) {
  events.forEach((event) => events$.next(event));
}

function isTaskTypeExcluded(excludedTaskTypes: string[], taskType: string) {
  for (const excludedType of excludedTaskTypes) {
    if (minimatch(taskType, excludedType)) {
      return true;
    }
  }

  return false;
}

async function markAvailableTasksAsClaimed({
  definitions,
  excludedTaskTypes,
  taskStore,
  claimOwnershipUntil,
  size,
  taskTypes,
  unusedTypes,
  taskMaxAttempts,
}: OwnershipClaimingOpts): Promise<UpdateByQueryResult> {
  const { taskTypesToSkip = [], taskTypesToClaim = [] } = groupBy(
    definitions.getAllTypes(),
    (type) =>
      taskTypes.has(type) && !isTaskTypeExcluded(excludedTaskTypes, type)
        ? 'taskTypesToClaim'
        : 'taskTypesToSkip'
  );
  const queryForScheduledTasks = mustBeAllOf(
    // Task must be enabled
    EnabledTask,
    // Either a task with idle status and runAt <= now or
    // status running or claiming with a retryAt <= now.
    shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt)
  );

  const sort: NonNullable<SearchOpts['sort']> = [SortByRunAtAndRetryAt];
  const query = matchesClauses(queryForScheduledTasks, filterDownBy(InactiveTasks));
  const script = updateFieldsAndMarkAsFailed({
    fieldUpdates: {
      ownerId: taskStore.taskManagerId,
      retryAt: claimOwnershipUntil,
    },
    claimableTaskTypes: taskTypesToClaim,
    skippedTaskTypes: taskTypesToSkip,
    unusedTaskTypes: unusedTypes,
    taskMaxAttempts: pick(taskMaxAttempts, taskTypesToClaim),
  });

  const apmTrans = apm.startTransaction(
    TASK_MANAGER_MARK_AS_CLAIMED,
    TASK_MANAGER_TRANSACTION_TYPE
  );

  try {
    const result = await taskStore.updateByQuery(
      {
        query,
        script,
        sort,
      },
      {
        max_docs: size,
      }
    );
    apmTrans.end('success');
    return result;
  } catch (err) {
    apmTrans.end('failure');
    throw err;
  }
}

async function sweepForClaimedTasks(
  taskStore: TaskStore,
  taskTypes: Set<string>,
  size: number
): Promise<ConcreteTaskInstance[]> {
  const claimedTasksQuery = tasksClaimedByOwner(
    taskStore.taskManagerId,
    tasksOfType([...taskTypes])
  );
  const { docs } = await taskStore.fetch({
    query: claimedTasksQuery,
    size,
    sort: SortByRunAtAndRetryAt,
    seq_no_primary_term: true,
  });

  return docs;
}

function emptyClaimOwnershipResult() {
  return {
    stats: {
      tasksUpdated: 0,
      tasksConflicted: 0,
      tasksClaimed: 0,
      tasksRejected: 0,
    },
    docs: [],
  };
}

function accumulateClaimOwnershipResults(
  prev: ClaimOwnershipResult = emptyClaimOwnershipResult(),
  next?: ClaimOwnershipResult
) {
  if (next) {
    const { stats, docs, timing } = next;
    const res = {
      stats: {
        tasksUpdated: stats.tasksUpdated + prev.stats.tasksUpdated,
        tasksConflicted: stats.tasksConflicted + prev.stats.tasksConflicted,
        tasksClaimed: stats.tasksClaimed + prev.stats.tasksClaimed,
      },
      docs,
      timing,
    };
    return res;
  }
  return prev;
}

function isLimited(
  batch: TaskClaimingBatch<BatchConcurrency.Limited | BatchConcurrency.Unlimited, unknown>
): batch is LimitedBatch {
  return batch.concurrency === BatchConcurrency.Limited;
}
