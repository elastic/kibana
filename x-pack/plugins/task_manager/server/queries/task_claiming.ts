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

export interface SearchForTasksOpts {
  size: number;
  taskTypes: string[];
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

export interface ClaimAvailableTasksImplResult {
  docs: ConcreteTaskInstance[];
  tasksConflicted: number;
}

export const isClaimOwnershipResult = (result: unknown): result is ClaimOwnershipResult =>
  isPlainObject((result as ClaimOwnershipResult).stats) &&
  Array.isArray((result as ClaimOwnershipResult).docs);

interface TaskClaimingBatches {
  excluded: string[];
  byCost: {
    [cost: number]: string[];
  };
  byConcurrency: Array<{
    taskType: string;
    concurrency: number;
  }>;
}

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

    this.taskClaimingBatchesByType = this.partitionIntoClaimingBatches(this.definitions);
    this.events$ = new Subject<TaskClaim>();
  }

  private partitionIntoClaimingBatches(definitions: TaskTypeDictionary): TaskClaimingBatches {
    const result: TaskClaimingBatches = {
      excluded: [],
      byCost: {},
      byConcurrency: [],
    };

    for (const taskTypeDef of definitions.getAllDefinitions()) {
      if (this.isTaskTypeExcluded(taskTypeDef.type)) {
        // Task type is configured by kibana.yml to be excluded
        result.excluded.push(taskTypeDef.type);
      } else if (typeof taskTypeDef.maxConcurrency === 'number') {
        // A Kibana instance should only run a given task type X at a time
        result.byConcurrency.push({
          taskType: taskTypeDef.type,
          concurrency: taskTypeDef.maxConcurrency,
        });
      } else {
        const cost = this.shareWorkers ? taskTypeDef.workerCost : 1;
        result.byCost[cost] = result.byCost[cost]
          ? result.byCost[cost].concat(taskTypeDef.type)
          : [taskTypeDef.type];
      }
    }

    // Add unrecognized tasks to the default cost (1)
    result.byCost[1] = result.byCost[1]
      ? result.byCost[1].concat(this.unusedTypes)
      : this.unusedTypes;

    return result;
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

    const taskCostGroups = Object.keys(this.taskClaimingBatchesByType.byCost)
      .map((cost) => parseFloat(cost))
      .sort();

    try {
      const results = await Promise.all([
        ...this.taskClaimingBatchesByType.byConcurrency
          .map((taskDef) => {
            const capacity = this.getCapacity(taskDef.taskType);
            if (capacity > 0) {
              return this.searchForTasks({ size: capacity, taskTypes: [taskDef.taskType] });
            }
          })
          .filter((p): p is Promise<ConcreteTaskInstance[]> => !!p),
        ...taskCostGroups.map((cost) =>
          this.searchForTasks({
            size: Math.floor(initialCapacity / cost),
            taskTypes: this.taskClaimingBatchesByType.byCost[cost],
          })
        ),
      ]);

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

              updates.status = TaskStatus.Claiming;
              updates.ownerId = this.taskStore.taskManagerId;
              updates.retryAt = claimOwnershipUntil;
            }

            docsToUpdate.push({ ...doc, ...updates });
            availableCapacity -= this.definitions.get(doc.taskType).workerCost;
          }
        }
      }

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

  private async searchForTasks({
    size,
    taskTypes,
  }: SearchForTasksOpts): Promise<ConcreteTaskInstance[]> {
    const queryForScheduledTasks = mustBeAllOf(
      // Task must be enabled
      EnabledTask,
      // Either a task with idle status and runAt <= now or
      // status running or claiming with a retryAt <= now.
      shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt),
      tasksOfType(taskTypes)
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
