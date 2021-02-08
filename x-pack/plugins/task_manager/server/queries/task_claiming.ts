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
import { Subject, Observable, from, of } from 'rxjs';
import { map, mergeScan } from 'rxjs/operators';
import { difference, partition, groupBy, mapValues, countBy } from 'lodash';
import { some, none } from 'fp-ts/lib/Option';

import { Logger } from '../../../../../src/core/server';

import { asOk, asErr, Result } from '../lib/result_type';
import { ConcreteTaskInstance, TaskStatus } from '../task';
import { TaskClaim, asTaskClaimEvent, TaskClaimErrorType } from '../task_events';

import {
  asUpdateByQuery,
  shouldBeOneOf,
  mustBeAllOf,
  filterDownBy,
  asPinnedQuery,
  matchesClauses,
  SortOptions,
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
} from '../task_store';
import { FillPoolResult } from '../lib/fill_pool';

export interface TaskClaimingOpts {
  logger: Logger;
  definitions: TaskTypeDictionary;
  taskStore: TaskStore;
  maxAttempts: number;
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
}

export class TaskClaiming {
  public readonly errors$ = new Subject<Error>();
  public readonly maxAttempts: number;

  private definitions: TaskTypeDictionary;
  private events$: Subject<TaskClaim>;
  private taskStore: TaskStore;
  private getCapacity: (taskType?: string) => number;
  private logger: Logger;
  private readonly taskClaimingBatchesByType: Array<Set<string>>;

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

    this.events$ = new Subject<TaskClaim>();
  }

  private partitionIntoClaimingBatches(definitions: TaskTypeDictionary) {
    const { limitedConcurrency, unlimitedConcurrency } = groupBy(
      definitions.getAllDefinitions(),
      (definition) => (definition.maxConcurrency ? 'limitedConcurrency' : 'unlimitedConcurrency')
    );
    return [
      ...(unlimitedConcurrency ? [new Set(unlimitedConcurrency.map(({ type }) => type))] : []),
      ...(limitedConcurrency ? limitedConcurrency.map(({ type }) => new Set([type])) : []),
    ];
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
        (prevResult, taskTypes) => {
          const capacity = Math.min(
            initialCapacity - prevResult.stats.tasksClaimed,
            this.getCapacity([...taskTypes][0])
          );
          // if we have no more capacity, short circuit here
          if (capacity <= 0) {
            return of(prevResult);
          }
          return from(
            this.executClaimAvailableTasks({
              claimOwnershipUntil,
              claimTasksById: claimTasksById.splice(0, capacity),
              size: capacity,
              taskTypes,
            }).then((result) => {
              const { stats, docs } = accumulateClaimOwnershipResults(prevResult, result);
              stats.tasksConflicted = correctVersionConflictsForContinuation(
                stats.tasksUpdated,
                stats.tasksConflicted,
                capacity
              );
              return { stats, docs };
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

  private executClaimAvailableTasks = async ({
    claimOwnershipUntil,
    claimTasksById = [],
    size,
    taskTypes,
  }: OwnershipClaimingOpts): Promise<ClaimOwnershipResult> => {
    const claimTasksByIdWithRawIds = this.taskStore.convertToSavedObjectIds(claimTasksById);
    const {
      updated: tasksUpdated,
      version_conflicts: tasksConflicted,
    } = await this.markAvailableTasksAsClaimed({
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

  private async markAvailableTasksAsClaimed({
    claimOwnershipUntil,
    claimTasksById,
    size,
    taskTypes,
  }: OwnershipClaimingOpts): Promise<UpdateByQueryResult> {
    const { taskTypesToSkip = [], taskTypesToClaim = [] } = groupBy(
      [...this.definitions],
      ([type]) => (taskTypes.has(type) ? 'taskTypesToClaim' : 'taskTypesToSkip')
    );
    const taskMaxAttempts = taskTypesToClaim.reduce((accumulator, [type, { maxAttempts }]) => {
      return { ...accumulator, [type]: maxAttempts || this.maxAttempts };
    }, {});
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
    const sort: SortOptions = [SortByRunAtAndRetryAt];
    if (claimTasksById && claimTasksById.length) {
      sort.unshift('_score');
    }

    const apmTrans = apm.startTransaction(`taskManager markAvailableTasksAsClaimed`, 'taskManager');
    const result = await this.taskStore.updateByQuery(
      asUpdateByQuery({
        query: matchesClauses(
          mustBeAllOf(
            claimTasksById && claimTasksById.length
              ? asPinnedQuery(claimTasksById, queryForScheduledTasks)
              : queryForScheduledTasks
          ),
          filterDownBy(InactiveTasks)
        ),
        update: updateFieldsAndMarkAsFailed(
          {
            ownerId: this.taskStore.taskManagerId,
            retryAt: claimOwnershipUntil,
          },
          claimTasksById || [],
          [...taskTypes],
          taskTypesToSkip.map(([type]) => type),
          taskMaxAttempts
        ),
        sort,
      }),
      {
        max_docs: size,
      }
    );

    if (apmTrans) apmTrans.end();
    return result;
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
    const res = {
      stats: {
        tasksUpdated: next.stats.tasksUpdated + prev.stats.tasksUpdated,
        tasksConflicted: next.stats.tasksConflicted + prev.stats.tasksConflicted,
        tasksClaimed: next.stats.tasksClaimed + prev.stats.tasksClaimed,
        tasksRejected: next.stats.tasksRejected + prev.stats.tasksRejected,
      },
      docs: next.docs,
    };
    return res;
  }
  return prev;
}
