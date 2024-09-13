/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, Observable } from 'rxjs';
import { Logger } from '@kbn/core/server';

import minimatch from 'minimatch';
import { TaskStore } from '../task_store';
import { TaskClaim, TaskTiming } from '../task_events';
import { TaskTypeDictionary } from '../task_type_dictionary';
import { TaskClaimingBatches } from '../queries/task_claiming';
import { ConcreteTaskInstance } from '../task';
import { claimAvailableTasksUpdateByQuery } from './strategy_update_by_query';
import { claimAvailableTasksMget } from './strategy_mget';
import { CLAIM_STRATEGY_UPDATE_BY_QUERY, CLAIM_STRATEGY_MGET } from '../config';
import { TaskPartitioner } from '../lib/task_partitioner';

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
  logger: Logger;
  taskPartitioner: TaskPartitioner;
}

export interface ClaimOwnershipResult {
  stats: {
    tasksUpdated: number;
    tasksConflicted: number;
    tasksClaimed: number;
    tasksLeftUnclaimed?: number;
    tasksErrors?: number;
  };
  docs: ConcreteTaskInstance[];
  timing?: TaskTiming;
}

export type TaskClaimerFn = (opts: TaskClaimerOpts) => Observable<ClaimOwnershipResult>;

let WarnedOnInvalidClaimer = false;

export function getTaskClaimer(logger: Logger, strategy: string): TaskClaimerFn {
  switch (strategy) {
    case CLAIM_STRATEGY_UPDATE_BY_QUERY:
      return claimAvailableTasksUpdateByQuery;
    case CLAIM_STRATEGY_MGET:
      return claimAvailableTasksMget;
  }

  if (!WarnedOnInvalidClaimer) {
    WarnedOnInvalidClaimer = true;
    logger.warn(`Unknown task claiming strategy "${strategy}", falling back to update_by_query`);
  }
  return claimAvailableTasksUpdateByQuery;
}

export function getEmptyClaimOwnershipResult(): ClaimOwnershipResult {
  return {
    stats: {
      tasksUpdated: 0,
      tasksConflicted: 0,
      tasksClaimed: 0,
    },
    docs: [],
  };
}

export function isTaskTypeExcluded(excludedTaskTypePatterns: string[], taskType: string) {
  for (const excludedTypePattern of excludedTaskTypePatterns) {
    if (minimatch(taskType, excludedTypePattern)) {
      return true;
    }
  }

  return false;
}

export function getExcludedTaskTypes(
  definitions: TaskTypeDictionary,
  excludedTaskTypePatterns: string[]
) {
  return definitions
    .getAllTypes()
    .filter((taskType) => isTaskTypeExcluded(excludedTaskTypePatterns, taskType));
}
