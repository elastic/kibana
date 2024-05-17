/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, Subject } from 'rxjs';

import { CLAIM_STRATEGY_DEFAULT } from '../config';
import { TaskClaimingBatches } from '../queries/task_claiming';
import { ConcreteTaskInstance } from '../task';
import { TaskClaim, TaskTiming } from '../task_events';
import { TaskStore } from '../task_store';
import { TaskTypeDictionary } from '../task_type_dictionary';
import { claimAvailableTasksDefault } from './strategy_default';

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

export interface ClaimOwnershipResult {
  stats: {
    tasksUpdated: number;
    tasksConflicted: number;
    tasksClaimed: number;
  };
  docs: ConcreteTaskInstance[];
  timing?: TaskTiming;
}

export type TaskClaimerFn = (opts: TaskClaimerOpts) => Observable<ClaimOwnershipResult>;

export function getTaskClaimer(strategy: string): TaskClaimerFn {
  switch (strategy) {
    case CLAIM_STRATEGY_DEFAULT:
      return claimAvailableTasksDefault;
  }
  throw new Error(`Unknown task claiming strategy (${strategy})`);
}
