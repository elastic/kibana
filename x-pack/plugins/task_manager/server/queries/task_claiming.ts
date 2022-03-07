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
import { map, mergeScan } from 'rxjs/operators';
import { difference, partition, groupBy, mapValues, countBy, pick, isPlainObject } from 'lodash';
import { some, none } from 'fp-ts/lib/Option';

import { Logger } from '../../../../../src/core/server';

import { asOk, asErr, Result } from '../lib/result_type';
import { ConcreteTaskInstance, TaskStatus } from '../task';
import {
  TaskClaim,
  asTaskClaimEvent,
  TaskClaimErrorType,
  startTaskTimer,
  TaskTiming,
} from '../task_events';

import {
  shouldBeOneOf,
  mustBeAllOf,
  filterDownBy,
  asPinnedQuery,
  matchesClauses,
} from './query_clauses';

import {
  updateFieldsAndMarkAsFailed,
  IdleTaskWithExpiredRunAt,
  InactiveTasks,
  RunningOrClaimingTaskWithExpiredRetryAt,
  SortByRunAtAndRetryAt,
  tasksClaimedByOwner,
  tasksOfType,
} from './mark_available_tasks_as_claimed';
import { TaskTypeDictionary } from '../task_type_dictionary';
import {
  correctVersionConflictsForContinuation,
  TaskStore,
  UpdateByQueryResult,
  SearchOpts,
} from '../task_store';
import { FillPoolResult } from '../lib/fill_pool';
import { TASK_MANAGER_TRANSACTION_TYPE } from '../task_running';

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
  claimTasksById?: string[];
  size: number;
  taskTypes: Set<string>;
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
    tasksRejected: number;
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

type TaskClaimingBatches = Array<UnlimitedBatch | LimitedBatch>;
interface TaskClaimingBatch<Concurrency extends BatchConcurrency, TaskType> {
  concurrency: Concurrency;
  tasksTypes: TaskType;
}
type UnlimitedBatch = TaskClaimingBatch<BatchConcurrency.Unlimited, Set<string>>;
type LimitedBatch = TaskClaimingBatch<BatchConcurrency.Limited, string>;

export const TASK_MANAGER_MARK_AS_CLAIMED = 'mark-available-tasks-as-claimed';

export class TaskClaiming {
  public readonly errors$ = new Subject<Error>();
  public readonly maxAttempts: number;

  private definitions: TaskTypeDictionary;
  private events$: Subject<TaskClaim>;
  private taskStore: TaskStore;
  private getCapacity: (taskType?: string) => number;
  private logger: Logger;
  private readonly taskClaimingBatchesByType: TaskClaimingBatches;
  private readonly taskMaxAttempts: Record<string, number>;
  private readonly excludedTaskTypes: string[];
  private readonly unusedTypes: string[];

  /**
   * Constructs a new TaskStore.
   * @param {TaskClaimingOpts} opts
   * @prop {number} maxAttempts - The maximum number of attempts before a task will be abandoned
   * @prop {TaskDefinition} definition - The definition of the task being run
   */
  constructor(opts: TaskClaimingOpts) {
    this.definitions = opts.definitions;
    this.maxAttempts = opts.maxAttempts;
    this.taskStore = opts.taskStore;
    this.getCapacity = opts.getCapacity;
    this.logger = opts.logger;
    this.taskClaimingBatchesByType = this.partitionIntoClaimingBatches(this.definitions);
    this.taskMaxAttempts = Object.fromEntries(this.normalizeMaxAttempts(this.definitions));
    this.excludedTaskTypes = opts.excludedTaskTypes;
    this.unusedTypes = opts.unusedTypes;

    this.events$ = new Subject<TaskClaim>();
  }

  private partitionIntoClaimingBatches(definitions: TaskTypeDictionary): TaskClaimingBatches {
    const { limitedConcurrency, unlimitedConcurrency, skippedTypes } = groupBy(
      definitions.getAllDefinitions(),
      (definition) =>
        definition.maxConcurrency
          ? 'limitedConcurrency'
          : definition.maxConcurrency === 0
          ? 'skippedTypes'
          : 'unlimitedConcurrency'
    );

    if (skippedTypes?.length) {
      this.logger.info(
        `Task Manager will never claim tasks of the following types as their "maxConcurrency" is set to 0: ${skippedTypes
          .map(({ type }) => type)
          .join(', ')}`
      );
    }
    return [
      ...(unlimitedConcurrency
        ? [asUnlimited(new Set(unlimitedConcurrency.map(({ type }) => type)))]
        : []),
      ...(limitedConcurrency ? limitedConcurrency.map(({ type }) => asLimited(type)) : []),
    ];
  }

  private normalizeMaxAttempts(definitions: TaskTypeDictionary) {
    return new Map(
      [...definitions].map(([type, { maxAttempts }]) => [type, maxAttempts || this.maxAttempts])
    );
  }

  private claimingBatchIndex = 0;
  private getClaimingBatches() {
    // return all batches, starting at index and cycling back to where we began
    const batch = [
      ...this.taskClaimingBatchesByType.slice(this.claimingBatchIndex),
      ...this.taskClaimingBatchesByType.slice(0, this.claimingBatchIndex),
    ];
    // shift claimingBatchIndex by one so that next cycle begins at the next index
    this.claimingBatchIndex = (this.claimingBatchIndex + 1) % this.taskClaimingBatchesByType.length;
    return batch;
  }

  public get events(): Observable<TaskClaim> {
    return this.events$;
  }

  private emitEvents = (events: TaskClaim[]) => {
    events.forEach((event) => this.events$.next(event));
  };

  public claimAvailableTasksIfCapacityIsAvailable(
    claimingOptions: Omit<OwnershipClaimingOpts, 'size' | 'taskTypes'>
  ): Observable<Result<ClaimOwnershipResult, FillPoolResult>> {
    if (this.getCapacity()) {
      return this.claimAvailableTasks(claimingOptions).pipe(
        map((claimResult) => asOk(claimResult))
      );
    }
    this.logger.debug(
      `[Task Ownership]: Task Manager has skipped Claiming Ownership of available tasks at it has ran out Available Workers.`
    );
    return of(asErr(FillPoolResult.NoAvailableWorkers));
  }

  public claimAvailableTasks({
    claimOwnershipUntil,
    claimTasksById = [],
  }: Omit<OwnershipClaimingOpts, 'size' | 'taskTypes'>): Observable<ClaimOwnershipResult> {
    const initialCapacity = this.getCapacity();
    return from(this.getClaimingBatches()).pipe(
      mergeScan(
        (accumulatedResult, batch) => {
          const stopTaskTimer = startTaskTimer();
          const capacity = Math.min(
            initialCapacity - accumulatedResult.stats.tasksClaimed,
            isLimited(batch) ? this.getCapacity(batch.tasksTypes) : this.getCapacity()
          );
          // if we have no more capacity, short circuit here
          if (capacity <= 0) {
            return of(accumulatedResult);
          }
          return from(
            this.executeClaimAvailableTasks({
              claimOwnershipUntil,
              claimTasksById: claimTasksById.splice(0, capacity),
              size: capacity,
              taskTypes: isLimited(batch) ? new Set([batch.tasksTypes]) : batch.tasksTypes,
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

  private executeClaimAvailableTasks = async ({
    claimOwnershipUntil,
    claimTasksById = [],
    size,
    taskTypes,
  }: OwnershipClaimingOpts): Promise<ClaimOwnershipResult> => {
    const claimTasksByIdWithRawIds = this.taskStore.convertToSavedObjectIds(claimTasksById);
    const { updated: tasksUpdated, version_conflicts: tasksConflicted } =
      await this.markAvailableTasksAsClaimed({
        claimOwnershipUntil,
        claimTasksById: claimTasksByIdWithRawIds,
        size,
        taskTypes,
      });

    const docs =
      tasksUpdated > 0
        ? await this.sweepForClaimedTasks(claimTasksByIdWithRawIds, taskTypes, size)
        : [];

    const [documentsReturnedById, documentsClaimedBySchedule] = partition(docs, (doc) =>
      claimTasksById.includes(doc.id)
    );

    const [documentsClaimedById, documentsRequestedButNotClaimed] = partition(
      documentsReturnedById,
      // we filter the schduled tasks down by status is 'claiming' in the esearch,
      // but we do not apply this limitation on tasks claimed by ID so that we can
      // provide more detailed error messages when we fail to claim them
      (doc) => doc.status === TaskStatus.Claiming
    );

    // count how many tasks we've claimed by ID and validate we have capacity for them to run
    const remainingCapacityOfClaimByIdByType = mapValues(
      // This means we take the tasks that were claimed by their ID and count them by their type
      countBy(documentsClaimedById, (doc) => doc.taskType),
      (count, type) => this.getCapacity(type) - count
    );

    const [documentsClaimedByIdWithinCapacity, documentsClaimedByIdOutOfCapacity] = partition(
      documentsClaimedById,
      (doc) => {
        // if we've exceeded capacity, we reject this task
        if (remainingCapacityOfClaimByIdByType[doc.taskType] < 0) {
          // as we're rejecting this task we can inc the count so that we know
          // to keep the next one returned by ID of the same type
          remainingCapacityOfClaimByIdByType[doc.taskType]++;
          return false;
        }
        return true;
      }
    );

    const documentsRequestedButNotReturned = difference(
      claimTasksById,
      documentsReturnedById.map((doc) => doc.id)
    );

    this.emitEvents([
      ...documentsClaimedByIdWithinCapacity.map((doc) => asTaskClaimEvent(doc.id, asOk(doc))),
      ...documentsClaimedByIdOutOfCapacity.map((doc) =>
        asTaskClaimEvent(
          doc.id,
          asErr({
            task: some(doc),
            errorType: TaskClaimErrorType.CLAIMED_BY_ID_OUT_OF_CAPACITY,
          })
        )
      ),
      ...documentsClaimedBySchedule.map((doc) => asTaskClaimEvent(doc.id, asOk(doc))),
      ...documentsRequestedButNotClaimed.map((doc) =>
        asTaskClaimEvent(
          doc.id,
          asErr({
            task: some(doc),
            errorType: TaskClaimErrorType.CLAIMED_BY_ID_NOT_IN_CLAIMING_STATUS,
          })
        )
      ),
      ...documentsRequestedButNotReturned.map((id) =>
        asTaskClaimEvent(
          id,
          asErr({ task: none, errorType: TaskClaimErrorType.CLAIMED_BY_ID_NOT_RETURNED })
        )
      ),
    ]);

    const stats = {
      tasksUpdated,
      tasksConflicted,
      tasksRejected: documentsClaimedByIdOutOfCapacity.length,
      tasksClaimed: documentsClaimedByIdWithinCapacity.length + documentsClaimedBySchedule.length,
    };

    if (docs.length !== stats.tasksClaimed + stats.tasksRejected) {
      this.logger.warn(
        `[Task Ownership error]: ${stats.tasksClaimed} tasks were claimed by Kibana, but ${
          docs.length
        } task(s) were fetched (${docs.map((doc) => doc.id).join(', ')})`
      );
    }

    return {
      stats,
      docs: [...documentsClaimedByIdWithinCapacity, ...documentsClaimedBySchedule],
    };
  };

  private isTaskTypeExcluded(taskType: string) {
    for (const excludedType of this.excludedTaskTypes) {
      if (minimatch(taskType, excludedType)) {
        return true;
      }
    }

    return false;
  }

  private async markAvailableTasksAsClaimed({
    claimOwnershipUntil,
    claimTasksById,
    size,
    taskTypes,
  }: OwnershipClaimingOpts): Promise<UpdateByQueryResult> {
    const { taskTypesToSkip = [], taskTypesToClaim = [] } = groupBy(
      this.definitions.getAllTypes(),
      (type) =>
        taskTypes.has(type) && !this.isTaskTypeExcluded(type)
          ? 'taskTypesToClaim'
          : 'taskTypesToSkip'
    );
    const queryForScheduledTasks = mustBeAllOf(
      // Either a task with idle status and runAt <= now or
      // status running or claiming with a retryAt <= now.
      shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt)
    );

    // The documents should be sorted by runAt/retryAt, unless there are pinned
    // tasks being queried, in which case we want to sort by score first, and then
    // the runAt/retryAt.  That way we'll get the pinned tasks first.  Note that
    // the score seems to favor newer documents rather than older documents, so
    // if there are not pinned tasks being queried, we do NOT want to sort by score
    // at all, just by runAt/retryAt.
    const sort: NonNullable<SearchOpts['sort']> = [SortByRunAtAndRetryAt];
    if (claimTasksById && claimTasksById.length) {
      sort.unshift('_score');
    }

    const query = matchesClauses(
      claimTasksById && claimTasksById.length
        ? mustBeAllOf(asPinnedQuery(claimTasksById, queryForScheduledTasks))
        : queryForScheduledTasks,
      filterDownBy(InactiveTasks)
    );
    const script = updateFieldsAndMarkAsFailed({
      fieldUpdates: {
        ownerId: this.taskStore.taskManagerId,
        retryAt: claimOwnershipUntil,
      },
      claimTasksById: claimTasksById || [],
      claimableTaskTypes: taskTypesToClaim,
      skippedTaskTypes: taskTypesToSkip,
      unusedTaskTypes: this.unusedTypes,
      taskMaxAttempts: pick(this.taskMaxAttempts, taskTypesToClaim),
    });

    const apmTrans = apm.startTransaction(
      TASK_MANAGER_MARK_AS_CLAIMED,
      TASK_MANAGER_TRANSACTION_TYPE
    );

    try {
      const result = await this.taskStore.updateByQuery(
        {
          query,
          script,
          sort,
        },
        {
          max_docs: size,
        }
      );
      apmTrans?.end('success');
      return result;
    } catch (err) {
      apmTrans?.end('failure');
      throw err;
    }
  }

  /**
   * Fetches tasks from the index, which are owned by the current Kibana instance
   */
  private async sweepForClaimedTasks(
    claimTasksById: OwnershipClaimingOpts['claimTasksById'],
    taskTypes: Set<string>,
    size: number
  ): Promise<ConcreteTaskInstance[]> {
    const claimedTasksQuery = tasksClaimedByOwner(
      this.taskStore.taskManagerId,
      tasksOfType([...taskTypes])
    );
    const { docs } = await this.taskStore.fetch({
      query:
        claimTasksById && claimTasksById.length
          ? asPinnedQuery(claimTasksById, claimedTasksQuery)
          : claimedTasksQuery,
      size,
      sort: SortByRunAtAndRetryAt,
      seq_no_primary_term: true,
    });

    return docs;
  }
}

const emptyClaimOwnershipResult = () => {
  return {
    stats: {
      tasksUpdated: 0,
      tasksConflicted: 0,
      tasksClaimed: 0,
      tasksRejected: 0,
    },
    docs: [],
  };
};

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
        tasksRejected: stats.tasksRejected + prev.stats.tasksRejected,
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
function asLimited(tasksType: string): LimitedBatch {
  return {
    concurrency: BatchConcurrency.Limited,
    tasksTypes: tasksType,
  };
}
function asUnlimited(tasksTypes: Set<string>): UnlimitedBatch {
  return {
    concurrency: BatchConcurrency.Unlimited,
    tasksTypes,
  };
}
