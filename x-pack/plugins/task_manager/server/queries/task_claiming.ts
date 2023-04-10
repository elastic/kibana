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
import { groupBy, isPlainObject } from 'lodash';

import { Logger } from '@kbn/core/server';

import { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { asOk, asErr, Result, isOk, isErr } from '../lib/result_type';
import { ConcreteTaskInstance, TaskStatus } from '../task';
import { TaskClaim, asTaskClaimEvent, startTaskTimer, TaskTiming } from '../task_events';
import { shouldBeOneOf, mustBeAllOf, filterDownBy, matchesClauses } from './query_clauses';

import {
  IdleTaskWithExpiredRunAt,
  InactiveTasks,
  RunningOrClaimingTaskWithExpiredRetryAt,
  SortByRunAtAndRetryAt,
  EnabledTask,
} from './mark_available_tasks_as_claimed';
import { TaskTypeDictionary } from '../task_type_dictionary';
import {
  correctVersionConflictsForContinuation,
  TaskStore,
  UpdateByQueryResult,
  SearchOpts,
  BulkUpdateResult,
} from '../task_store';
import { FillPoolResult } from '../lib/fill_pool';
import { TASK_MANAGER_TRANSACTION_TYPE } from '../task_running';
import { TaskPartitioner } from '../task_partitioner';

export interface TaskClaimingOpts {
  logger: Logger;
  definitions: TaskTypeDictionary;
  unusedTypes: string[];
  taskStore: TaskStore;
  maxAttempts: number;
  excludedTaskTypes: string[];
  getCapacity: (taskType?: string) => number;
  taskPartitioner: TaskPartitioner;
}

export interface OwnershipClaimingOpts {
  claimOwnershipUntil: Date;
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

interface ClaimAvailableTasksResult {
  docs: ConcreteTaskInstance[];
  tasksConflicted: number;
}

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
  private readonly taskPartitioner: TaskPartitioner;

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
    this.logger = opts.logger.get('taskClaiming');
    this.taskClaimingBatchesByType = this.partitionIntoClaimingBatches(this.definitions);
    this.taskMaxAttempts = Object.fromEntries(this.normalizeMaxAttempts(this.definitions));
    this.excludedTaskTypes = opts.excludedTaskTypes;
    this.unusedTypes = opts.unusedTypes;
    this.taskPartitioner = opts.taskPartitioner;

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
    size,
    taskTypes,
  }: OwnershipClaimingOpts): Promise<ClaimOwnershipResult> => {
    const { docs, tasksConflicted } = await this.claimAvailableTasksImpl({
      claimOwnershipUntil,
      size,
      taskTypes,
    });

    this.emitEvents(docs.map((doc) => asTaskClaimEvent(doc.id, asOk(doc))));

    const stats = {
      tasksUpdated: docs.length,
      tasksConflicted,
      tasksClaimed: docs.length,
    };

    return {
      stats,
      docs,
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

  private async claimAvailableTasksImpl({
    claimOwnershipUntil,
    size: claimSize,
    taskTypes,
  }: OwnershipClaimingOpts): Promise<ClaimAvailableTasksResult> {
    const partitions = await this.taskPartitioner.getPartitions();

    this.logger
      .get('partitions')
      .debug(`Claiming tasks for ${partitions.length} partitions: ${partitions.join(',')}`);
    const { taskTypesToClaim = [] } = groupBy(this.definitions.getAllTypes(), (type) =>
      taskTypes.has(type) && !this.isTaskTypeExcluded(type) ? 'taskTypesToClaim' : 'taskTypesToSkip'
    );
    const queryForScheduledTasks = mustBeAllOf(
      // Task must be enabled
      EnabledTask,
      // Either a task with idle status and runAt <= now or
      // status running or claiming with a retryAt <= now.
      shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt),
      {
        bool: { must: { terms: { 'task.partition': partitions } } },
      },
      {
        bool: { must: { terms: { 'task.taskType': [...taskTypesToClaim, ...this.unusedTypes] } } },
      }
    );

    const sort: NonNullable<SearchOpts['sort']> = [SortByRunAtAndRetryAt];
    const query = matchesClauses(queryForScheduledTasks, filterDownBy(InactiveTasks));
    const apmTrans = apm.startTransaction(
      TASK_MANAGER_MARK_AS_CLAIMED,
      TASK_MANAGER_TRANSACTION_TYPE
    );

    // ugly constant... this accommodates for 2 Kibana nodes trying to claim the same tasks
    // and Elasticsearch's refresh rate being twice the poll interval
    const searchSize = claimSize * 4;

    // counters just used for logging
    let searchesCount = 0;
    let bulkUpdatesCount = 0;

    try {
      let hasMore = true;
      let searchAfter: SortResults | undefined;
      const updatedDocs: ConcreteTaskInstance[] = [];
      let tasksConflicted = 0;
      let staleTasks = 0;

      do {
        // we're going to search for more docs than we need
        // so if we hit a version conflict claiming one, we can proceed with
        // claiming more docs without having to do another search
        ++searchesCount;
        const searchResult = await this.taskStore.search({
          query,
          sort,
          size: searchSize,
          seq_no_primary_term: true,
          search_after: searchAfter,
        });

        const updateableDocs = searchResult.docs;
        if (updateableDocs.length < searchSize) {
          hasMore = false;
        } else {
          searchAfter = searchResult.searchAfter;
        }

        do {
          const docsToUpdate: ConcreteTaskInstance[] = [];

          // Searches can return stale documents. As a result, we are
          // going to do a mget to use realtime search to get the most recent
          // doc, and if it has been updated we will skip updating it below
          const bulkGetResult = await this.taskStore.bulkGet(updateableDocs.map((docs) => docs.id));
          const bulkGetResultVersions = bulkGetResult.reduce((acc, bulkGetResultItem) => {
            if (isOk(bulkGetResultItem)) {
              acc.set(bulkGetResultItem.value.id, bulkGetResultItem.value.version!);
            }
            return acc;
          }, new Map<string, string>());
          while (
            docsToUpdate.length < claimSize - updatedDocs.length &&
            updateableDocs.length > 0
          ) {
            const doc = updateableDocs.shift()!;
            if (bulkGetResultVersions.get(doc.id) !== doc.version) {
              ++staleTasks;
            } else if (taskTypesToClaim.includes(doc.taskType)) {
              docsToUpdate.push(doc);
              if (doc.schedule != null || doc.attempts < this.taskMaxAttempts[doc.taskType]) {
                if (doc.retryAt != null && doc.retryAt < new Date()) {
                  doc.scheduledAt = doc.retryAt;
                } else {
                  doc.scheduledAt = doc.runAt;
                }

                doc.status = TaskStatus.Claiming;
                doc.ownerId = this.taskStore.taskManagerId;
                doc.retryAt = claimOwnershipUntil;
              } else {
                docsToUpdate.push(doc);
                doc.status = TaskStatus.Failed;
              }
            } else if (this.unusedTypes.includes(doc.taskType)) {
              docsToUpdate.push(doc);
              doc.status = TaskStatus.Unrecognized;
            }
          }

          let bulkUpdateResults: BulkUpdateResult[] = [];
          if (docsToUpdate.length > 0) {
            ++bulkUpdatesCount;
            bulkUpdateResults = await this.taskStore.bulkUpdate(docsToUpdate);
          }

          for (const bulkUpdateResult of bulkUpdateResults) {
            if (isOk(bulkUpdateResult)) {
              updatedDocs.push(bulkUpdateResult.value);
            } else {
              tasksConflicted++;
            }
          }
        } while (updatedDocs.length < claimSize && updateableDocs.length > 0);
      } while (updatedDocs.length < claimSize && hasMore && searchAfter);

      apmTrans?.end('success');

      this.logger
        .get('claim')
        .debug(
          `# task types: ${taskTypesToClaim.length}\t# claim size: ${claimSize}\t# claimed: ${updatedDocs.length}\t# searches: ${searchesCount}\t# bulk updates: ${bulkUpdatesCount}\t# version conflicts: ${tasksConflicted}\t# stale pruned: ${staleTasks}}`
        );

      // Not all of the updated docs are "claimed" and ready to be ran
      // we also update some tasks to be failed and unrecognized
      const claimedDocs = updatedDocs.filter((doc) => doc.status === TaskStatus.Claiming);
      return {
        docs: claimedDocs,
        tasksConflicted,
      };
    } catch (err) {
      apmTrans?.end('failure');
      throw err;
    }
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
