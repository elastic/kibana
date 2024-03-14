/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * This module contains helpers for managing the task manager storage layer.
 */
import { Subject, Observable, of, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { isPlainObject } from 'lodash';
import minimatch from 'minimatch';

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

export type { ClaimOwnershipResult } from '../task_claimers';
export interface TaskClaimingOpts {
  logger: Logger;
  strategy: string;
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

export function isClaimOwnershipResult(result: unknown): result is ClaimOwnershipResult {
  return (
    isPlainObject((result as ClaimOwnershipResult).stats) &&
    Array.isArray((result as ClaimOwnershipResult).docs)
  );
}

export type TaskClaimingBatches = Array<{
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
  private readonly taskMaxAttempts: Record<string, number>;
  private readonly excludedTaskTypes: string[];
  private readonly unusedTypes: string[];
  private readonly taskClaimer: TaskClaimerFn;

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
    this.taskMaxAttempts = Object.fromEntries(this.normalizeMaxAttempts(this.definitions));
    this.excludedTaskTypes = opts.excludedTaskTypes;
    this.unusedTypes = opts.unusedTypes;
    this.taskClaimer = getTaskClaimer(opts.strategy);
    this.events$ = new Subject<TaskClaim>();
    this.taskClaimingBatches = this.partitionIntoClaimingBatches(this.definitions);
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
      } else if (!isTaskTypeExcluded(this.excludedTaskTypes, taskTypeDef.type)) {
        const cost = taskTypeDef.workerCost;
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

  private normalizeMaxAttempts(definitions: TaskTypeDictionary) {
    return new Map(
      [...definitions].map(([type, { maxAttempts }]) => [type, maxAttempts || this.maxAttempts])
    );
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

  public claimAvailableTasksIfCapacityIsAvailable(
    claimingOptions: Omit<OwnershipClaimingOpts, 'size' | 'taskTypes'>
  ): Observable<Result<ClaimOwnershipResult, FillPoolResult>> {
    if (this.getCapacity() > 0) {
      const opts: TaskClaimerOpts = {
        batches: this.getClaimingBatches(),
        claimOwnershipUntil: claimingOptions.claimOwnershipUntil,
        taskStore: this.taskStore,
        events$: this.events$,
        getCapacity: this.getCapacity,
        unusedTypes: this.unusedTypes,
        definitions: this.definitions,
        taskMaxAttempts: this.taskMaxAttempts,
        excludedTaskTypes: this.excludedTaskTypes,
      };
      return from(this.taskClaimer(opts)).pipe(map((claimResult) => asOk(claimResult)));
    }
    this.logger.debug(
      `[Task Ownership]: Task Manager has skipped Claiming Ownership of available tasks at it has ran out Available Workers.`
    );
    return of(asErr(FillPoolResult.NoAvailableWorkers));
  }
}

function isTaskTypeExcluded(excludedTaskTypes: string[], taskType: string) {
  for (const excludedType of excludedTaskTypes) {
    if (minimatch(taskType, excludedType)) {
      return true;
    }
  }

  return false;
}
