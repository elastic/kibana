/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * This module contains helpers for managing the task manager storage layer.
 */
import { Subject, Observable, of } from 'rxjs';
import { map } from 'rxjs';
import { groupBy, isPlainObject } from 'lodash';

import { Logger } from '@kbn/core/server';

import { asOk, asErr, Result } from '../lib/result_type';
import { ConcreteTaskInstance } from '../task';
import { TaskClaim } from '../task_events';

import { TaskTypeDictionary } from '../task_type_dictionary';
import { TaskStore, UpdateByQueryResult } from '../task_store';
import { FillPoolResult } from '../lib/fill_pool';
import {
  TaskClaimerOpts,
  TaskClaimerFn,
  ClaimOwnershipResult,
  getTaskClaimer,
} from '../task_claimers';
import { TaskPartitioner } from '../lib/task_partitioner';
import { createWrappedLogger } from '../lib/wrapped_logger';

export type { ClaimOwnershipResult } from '../task_claimers';
export interface TaskClaimingOpts {
  logger: Logger;
  strategy: string;
  definitions: TaskTypeDictionary;
  unusedTypes: string[];
  taskStore: TaskStore;
  maxAttempts: number;
  excludedTaskTypes: string[];
  getAvailableCapacity: (taskType?: string) => number;
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

export function isClaimOwnershipResult(result: unknown): result is ClaimOwnershipResult {
  return (
    isPlainObject((result as ClaimOwnershipResult).stats) &&
    Array.isArray((result as ClaimOwnershipResult).docs)
  );
}

export enum BatchConcurrency {
  Unlimited,
  Limited,
}

export type TaskClaimingBatches = Array<UnlimitedBatch | LimitedBatch>;
export interface TaskClaimingBatch<Concurrency extends BatchConcurrency, TaskType> {
  concurrency: Concurrency;
  tasksTypes: TaskType;
}
export type UnlimitedBatch = TaskClaimingBatch<BatchConcurrency.Unlimited, Set<string>>;
export type LimitedBatch = TaskClaimingBatch<BatchConcurrency.Limited, string>;

export const TASK_MANAGER_MARK_AS_CLAIMED = 'mark-available-tasks-as-claimed';

export class TaskClaiming {
  public readonly errors$ = new Subject<Error>();
  public readonly maxAttempts: number;

  private definitions: TaskTypeDictionary;
  private events$: Subject<TaskClaim>;
  private taskStore: TaskStore;
  private getAvailableCapacity: (taskType?: string) => number;
  private logger: Logger;
  private readonly taskClaimingBatchesByType: TaskClaimingBatches;
  private readonly taskMaxAttempts: Record<string, number>;
  private readonly excludedTaskTypes: string[];
  private readonly unusedTypes: string[];
  private readonly taskClaimer: TaskClaimerFn;
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
    this.getAvailableCapacity = opts.getAvailableCapacity;
    this.logger = createWrappedLogger({ logger: opts.logger, tags: ['taskClaiming'] });
    this.taskClaimingBatchesByType = this.partitionIntoClaimingBatches(this.definitions);
    this.taskMaxAttempts = Object.fromEntries(this.normalizeMaxAttempts(this.definitions));
    this.excludedTaskTypes = opts.excludedTaskTypes;
    this.unusedTypes = opts.unusedTypes;
    this.taskClaimer = getTaskClaimer(this.logger, opts.strategy);
    this.events$ = new Subject<TaskClaim>();
    this.taskPartitioner = opts.taskPartitioner;

    this.logger.info(`using task claiming strategy: ${opts.strategy}`);
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

  public claimAvailableTasksIfCapacityIsAvailable(
    claimingOptions: Omit<OwnershipClaimingOpts, 'size' | 'taskTypes'>
  ): Observable<Result<ClaimOwnershipResult, FillPoolResult>> {
    if (this.getAvailableCapacity()) {
      const opts: TaskClaimerOpts = {
        batches: this.getClaimingBatches(),
        claimOwnershipUntil: claimingOptions.claimOwnershipUntil,
        taskStore: this.taskStore,
        events$: this.events$,
        getCapacity: this.getAvailableCapacity,
        unusedTypes: this.unusedTypes,
        definitions: this.definitions,
        taskMaxAttempts: this.taskMaxAttempts,
        excludedTaskTypes: this.excludedTaskTypes,
        logger: this.logger,
        taskPartitioner: this.taskPartitioner,
      };
      return this.taskClaimer(opts).pipe(map((claimResult) => asOk(claimResult)));
    }
    this.logger.debug(
      `[Task Ownership]: Task Manager has skipped Claiming Ownership of available tasks at it has ran out Available Workers.`
    );
    return of(asErr(FillPoolResult.NoAvailableWorkers));
  }
}

export function isLimited(
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
