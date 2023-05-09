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
import { map } from 'rxjs/operators';
import { isPlainObject } from 'lodash';

import { Logger } from '@kbn/core/server';

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
  shareWorkers: boolean;
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

type TaskClaimingBatches = Array<{
  size: () => number;
  types: string[];
}>;

export const TASK_MANAGER_MARK_AS_CLAIMED = 'mark-available-tasks-as-claimed';

export class TaskClaiming {
  public readonly errors$ = new Subject<Error>();
  public readonly maxAttempts: number;

  private definitions: TaskTypeDictionary;
  private events$: Subject<TaskClaim>;
  private taskStore: TaskStore;
  private getCapacity: (taskType?: string) => number;
  private logger: Logger;
  private readonly taskClaimingBatches: TaskClaimingBatches;
  private readonly excludedTaskTypes: string[];
  private readonly unusedTypes: string[];
  private readonly shareWorkers: boolean;

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
    this.shareWorkers = opts.shareWorkers;
    this.excludedTaskTypes = opts.excludedTaskTypes;
    this.unusedTypes = opts.unusedTypes;

    this.taskClaimingBatches = this.partitionIntoClaimingBatches(this.definitions);
    this.events$ = new Subject<TaskClaim>();
  }

  private partitionIntoClaimingBatches(definitions: TaskTypeDictionary): TaskClaimingBatches {
    const result: TaskClaimingBatches = [];
    const typesByCost: Record<number, string[]> = {
      // Add unrecognized tasks to the default cost (1)
      1: this.unusedTypes,
    };
    for (const taskTypeDef of definitions.getAllDefinitions()) {
      if (typeof taskTypeDef.maxConcurrency === 'number') {
        // A Kibana instance should only run a given task type X at a time
        result.push({
          size: () => this.getCapacity(taskTypeDef.type),
          types: [taskTypeDef.type],
        });
      } else if (!this.isTaskTypeExcluded(taskTypeDef.type)) {
        const cost = this.shareWorkers ? taskTypeDef.workerCost : 1;
        if (!typesByCost[cost]) {
          typesByCost[cost] = [];
        }
        typesByCost[cost].push(taskTypeDef.type);
      }
    }

    for (const cost of Object.keys(typesByCost)
      .map((c) => parseFloat(c))
      .sort()) {
      result.push({
        size: () => Math.floor(this.getCapacity() / cost),
        types: typesByCost[cost],
      });
    }

    return result;
  }

  private claimingBatchIndex = 0;
  private getClaimingBatches() {
    // return all batches, starting at index and cycling back to where we began
    const batch = [
      ...this.taskClaimingBatches.slice(this.claimingBatchIndex),
      ...this.taskClaimingBatches.slice(0, this.claimingBatchIndex),
    ];
    // shift claimingBatchIndex by one so that next cycle begins at the next index
    this.claimingBatchIndex = (this.claimingBatchIndex + 1) % this.taskClaimingBatches.length;
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
    if (this.getCapacity() > 0) {
      return from(this.claimAvailableTasks(claimingOptions)).pipe(
        map((claimResult) => asOk(claimResult))
      );
    }
    this.logger.debug(
      `[Task Ownership]: Task Manager has skipped Claiming Ownership of available tasks at it has ran out Available Workers.`
    );
    return of(asErr(FillPoolResult.NoAvailableWorkers));
  }

  public async claimAvailableTasks({
    claimOwnershipUntil,
  }: Omit<OwnershipClaimingOpts, 'size' | 'taskTypes'>): Promise<ClaimOwnershipResult> {
    const initialCapacity = this.getCapacity();
    const stopTaskTimer = startTaskTimer();

    const apmTrans = apm.startTransaction(
      TASK_MANAGER_MARK_AS_CLAIMED,
      TASK_MANAGER_TRANSACTION_TYPE
    );

    try {
      const results = await Promise.all(
        this.getClaimingBatches()
          .map((batch) => {
            const size = batch.size();
            if (size > 0) {
              return this.searchForTasks(size, batch.types);
            }
          })
          .filter((p): p is Promise<ConcreteTaskInstance[]> => !!p)
      );

      const docsToUpdate = this.processResultFromSearches(results, claimOwnershipUntil);

      if (docsToUpdate.length === 0) {
        return {
          stats: {
            tasksUpdated: 0,
            tasksConflicted: 0,
            tasksClaimed: 0,
          },
          docs: [],
          timing: stopTaskTimer(),
        };
      }

      const bulkUpdateResults = await this.taskStore.bulkUpdate(docsToUpdate);
      apmTrans?.end('success');

      const claimedDocs = bulkUpdateResults.filter(isOk).map((result) => result.value);
      const numOfVersionConflicts = bulkUpdateResults
        .filter(isErr)
        .filter((result) => result.error.error.error === 'Conflict').length;

      this.emitEvents(claimedDocs.map((doc) => asTaskClaimEvent(doc.id, asOk(doc))));

      return {
        stats: {
          tasksUpdated: claimedDocs.length,
          tasksConflicted: correctVersionConflictsForContinuation(
            claimedDocs.length,
            numOfVersionConflicts,
            initialCapacity
          ),
          tasksClaimed: claimedDocs.length,
        },
        docs: claimedDocs,
        timing: stopTaskTimer(),
      };
    } catch (e) {
      apmTrans?.end('failure');
      throw e;
    }
  }

  private processResultFromSearches(
    results: ConcreteTaskInstance[][],
    claimOwnershipUntil: Date
  ): ConcreteTaskInstance[] {
    // Calculate capacity again in case more capacity opened up since the search queries started
    let availableCapacity = this.getCapacity();
    const docsToUpdate: ConcreteTaskInstance[] = [];
    for (const result of results) {
      for (const doc of result) {
        if (availableCapacity - this.definitions.get(doc.taskType).workerCost >= 0) {
          const updates: Partial<ConcreteTaskInstance> = {};

          if (this.unusedTypes.includes(doc.taskType)) {
            updates.status = TaskStatus.Unrecognized;
          } else {
            if (doc.retryAt && doc.retryAt < new Date()) {
              updates.scheduledAt = doc.retryAt || undefined;
            } else {
              updates.scheduledAt = doc.runAt;
            }

            // TODO: We should be able to set them directly to running at this point
            updates.status = TaskStatus.Claiming;
            updates.ownerId = this.taskStore.taskManagerId;
            updates.retryAt = claimOwnershipUntil;
          }

          docsToUpdate.push({ ...doc, ...updates });
          availableCapacity -= this.definitions.get(doc.taskType).workerCost;
        }
      }
    }
    return docsToUpdate;
  }

  private async searchForTasks(size: number, types: string[]): Promise<ConcreteTaskInstance[]> {
    const queryForScheduledTasks = mustBeAllOf(
      // Task must be enabled
      EnabledTask,
      // Either a task with idle status and runAt <= now or
      // status running or claiming with a retryAt <= now.
      shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt),
      tasksOfType(types)
    );

    const sort: NonNullable<SearchOpts['sort']> = [SortByRunAtAndRetryAt];
    const query = matchesClauses(queryForScheduledTasks, filterDownBy(InactiveTasks));

    const searchResult = await this.taskStore.search({
      query,
      sort,
      size,
      seq_no_primary_term: true,
    });

    return searchResult.docs;
  }

  private isTaskTypeExcluded(taskType: string) {
    for (const excludedType of this.excludedTaskTypes) {
      if (minimatch(taskType, excludedType)) {
        return true;
      }
    }

    return false;
  }
}
