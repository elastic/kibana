/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { interval, merge, of, Observable } from 'rxjs';
import { filter, mergeScan, map, scan, distinctUntilChanged, startWith } from 'rxjs';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { Logger } from '@kbn/core/server';
import { isEsCannotExecuteScriptError } from './identify_es_error';
import { CLAIM_STRATEGY_MGET, DEFAULT_CAPACITY, MAX_CAPACITY, TaskManagerConfig } from '../config';
import { TaskCost } from '../task';
import { getMsearchStatusCode } from './msearch_error';
import { getBulkUpdateStatusCode } from './bulk_update_error';

const FLUSH_MARKER = Symbol('flush');
export const ADJUST_THROUGHPUT_INTERVAL = 10 * 1000;
export const PREFERRED_MAX_POLL_INTERVAL = 60 * 1000;

// Capacity is measured in number of normal cost tasks that can be run
// At a minimum, we need to be able to run a single task with the greatest cost
// so we should convert the greatest cost to normal cost
export const MIN_COST = TaskCost.ExtraLarge / TaskCost.Normal;

// For default claim strategy
export const MIN_WORKERS = 1;

// When errors occur, reduce capacity by CAPACITY_DECREASE_PERCENTAGE
// When errors no longer occur, start increasing capacity by CAPACITY_INCREASE_PERCENTAGE
// until starting value is reached
const CAPACITY_DECREASE_PERCENTAGE = 0.8;
const CAPACITY_INCREASE_PERCENTAGE = 1.05;

// When errors occur, increase pollInterval by POLL_INTERVAL_INCREASE_PERCENTAGE
// When errors no longer occur, start decreasing pollInterval by POLL_INTERVAL_DECREASE_PERCENTAGE
// until starting value is reached
const POLL_INTERVAL_DECREASE_PERCENTAGE = 0.95;
const POLL_INTERVAL_INCREASE_PERCENTAGE = 1.2;

interface ManagedConfigurationOpts {
  config: TaskManagerConfig;
  defaultCapacity?: number;
  errors$: Observable<Error>;
  logger: Logger;
}

export interface ManagedConfiguration {
  startingCapacity: number;
  capacityConfiguration$: Observable<number>;
  pollIntervalConfiguration$: Observable<number>;
}

export function createManagedConfiguration({
  config,
  defaultCapacity = DEFAULT_CAPACITY,
  logger,
  errors$,
}: ManagedConfigurationOpts): ManagedConfiguration {
  const errorCheck$ = countErrors(errors$, ADJUST_THROUGHPUT_INTERVAL);
  const startingCapacity = calculateStartingCapacity(config, logger, defaultCapacity);
  const startingPollInterval = config.poll_interval;
  return {
    startingCapacity,
    capacityConfiguration$: errorCheck$.pipe(
      createCapacityScan(config, logger, startingCapacity),
      startWith(startingCapacity),
      distinctUntilChanged()
    ),
    pollIntervalConfiguration$: errorCheck$.pipe(
      createPollIntervalScan(logger, startingPollInterval),
      startWith(startingPollInterval),
      distinctUntilChanged()
    ),
  };
}

function createCapacityScan(config: TaskManagerConfig, logger: Logger, startingCapacity: number) {
  return scan((previousCapacity: number, errorCount: number) => {
    let newCapacity: number;
    if (errorCount > 0) {
      const minCapacity = getMinCapacity(config);
      // Decrease capacity by CAPACITY_DECREASE_PERCENTAGE while making sure it doesn't go lower than minCapacity.
      // Using Math.floor to make sure the number is different than previous while not being a decimal value.
      newCapacity = Math.max(
        Math.floor(previousCapacity * CAPACITY_DECREASE_PERCENTAGE),
        minCapacity
      );
    } else {
      // Increase capacity by CAPACITY_INCREASE_PERCENTAGE while making sure it doesn't go
      // higher than the starting value. Using Math.ceil to make sure the number is different than
      // previous while not being a decimal value
      newCapacity = Math.min(
        startingCapacity,
        Math.ceil(previousCapacity * CAPACITY_INCREASE_PERCENTAGE)
      );
    }

    if (newCapacity !== previousCapacity) {
      logger.debug(
        `Capacity configuration changing from ${previousCapacity} to ${newCapacity} after seeing ${errorCount} "too many request" and/or "execute [inline] script" error(s)`
      );
      if (previousCapacity === startingCapacity) {
        logger.warn(
          `Capacity configuration is temporarily reduced after Elasticsearch returned ${errorCount} "too many request" and/or "execute [inline] script" error(s).`
        );
      }
    }
    return newCapacity;
  }, startingCapacity);
}

function createPollIntervalScan(logger: Logger, startingPollInterval: number) {
  return scan((previousPollInterval: number, errorCount: number) => {
    let newPollInterval: number;
    if (errorCount > 0) {
      // Increase poll interval by POLL_INTERVAL_INCREASE_PERCENTAGE and use Math.ceil to
      // make sure the number is different than previous while not being a decimal value.
      // Also ensure we don't go over PREFERRED_MAX_POLL_INTERVAL or startingPollInterval,
      // whichever is greater.
      newPollInterval = Math.min(
        Math.ceil(previousPollInterval * POLL_INTERVAL_INCREASE_PERCENTAGE),
        Math.ceil(Math.max(PREFERRED_MAX_POLL_INTERVAL, startingPollInterval))
      );
      if (!Number.isSafeInteger(newPollInterval) || newPollInterval < 0) {
        logger.error(
          `Poll interval configuration had an issue calculating the new poll interval: Math.min(Math.ceil(${previousPollInterval} * ${POLL_INTERVAL_INCREASE_PERCENTAGE}), Math.max(${PREFERRED_MAX_POLL_INTERVAL}, ${startingPollInterval})) = ${newPollInterval}, will keep the poll interval unchanged (${previousPollInterval})`
        );
        newPollInterval = previousPollInterval;
      }
    } else {
      // Decrease poll interval by POLL_INTERVAL_DECREASE_PERCENTAGE and use Math.floor to
      // make sure the number is different than previous while not being a decimal value.
      newPollInterval = Math.max(
        startingPollInterval,
        Math.floor(previousPollInterval * POLL_INTERVAL_DECREASE_PERCENTAGE)
      );
      if (!Number.isSafeInteger(newPollInterval) || newPollInterval < 0) {
        logger.error(
          `Poll interval configuration had an issue calculating the new poll interval: Math.max(${startingPollInterval}, Math.floor(${previousPollInterval} * ${POLL_INTERVAL_DECREASE_PERCENTAGE})) = ${newPollInterval}, will keep the poll interval unchanged (${previousPollInterval})`
        );
        newPollInterval = previousPollInterval;
      }
    }
    if (newPollInterval !== previousPollInterval) {
      logger.debug(
        `Poll interval configuration changing from ${previousPollInterval} to ${newPollInterval} after seeing ${errorCount} "too many request" and/or "execute [inline] script" error(s)`
      );
      if (previousPollInterval === startingPollInterval) {
        logger.warn(
          `Poll interval configuration is temporarily increased after Elasticsearch returned ${errorCount} "too many request" and/or "execute [inline] script" error(s).`
        );
      }
    }
    return newPollInterval;
  }, startingPollInterval);
}

function countErrors(errors$: Observable<Error>, countInterval: number): Observable<number> {
  return merge(
    // Flush error count at fixed interval
    interval(countInterval).pipe(map(() => FLUSH_MARKER)),
    errors$.pipe(
      filter(
        (e) =>
          SavedObjectsErrorHelpers.isTooManyRequestsError(e) ||
          SavedObjectsErrorHelpers.isEsUnavailableError(e) ||
          SavedObjectsErrorHelpers.isGeneralError(e) ||
          isEsCannotExecuteScriptError(e) ||
          getMsearchStatusCode(e) === 429 ||
          getMsearchStatusCode(e) === 500 ||
          getMsearchStatusCode(e) === 503 ||
          getBulkUpdateStatusCode(e) === 429 ||
          getBulkUpdateStatusCode(e) === 500 ||
          getBulkUpdateStatusCode(e) === 503
      )
    )
  ).pipe(
    // When tag is "flush", reset the error counter
    // Otherwise increment the error counter
    mergeScan(({ count }, next) => {
      return next === FLUSH_MARKER
        ? of(emitErrorCount(count), resetErrorCount())
        : of(incementErrorCount(count));
    }, emitErrorCount(0)),
    filter(isEmitEvent),
    map(({ count }) => count)
  );
}

function emitErrorCount(count: number) {
  return {
    tag: 'emit',
    count,
  };
}

function isEmitEvent(event: { tag: string; count: number }) {
  return event.tag === 'emit';
}

function incementErrorCount(count: number) {
  return {
    tag: 'inc',
    count: count + 1,
  };
}

function resetErrorCount() {
  return {
    tag: 'initial',
    count: 0,
  };
}

function getMinCapacity(config: TaskManagerConfig) {
  switch (config.claim_strategy) {
    case CLAIM_STRATEGY_MGET:
      return MIN_COST;

    default:
      return MIN_WORKERS;
  }
}

export function calculateStartingCapacity(
  config: TaskManagerConfig,
  logger: Logger,
  defaultCapacity: number
): number {
  if (config.capacity !== undefined && config.max_workers !== undefined) {
    logger.warn(
      `Both "xpack.task_manager.capacity" and "xpack.task_manager.max_workers" configs are set, max_workers will be ignored in favor of capacity and the setting should be removed.`
    );
  }

  if (config.capacity) {
    // Use capacity if explicitly set
    return config.capacity!;
  } else if (config.max_workers) {
    // Otherwise use max_worker value as capacity, capped at MAX_CAPACITY
    return Math.min(config.max_workers, MAX_CAPACITY);
  }

  // Neither are set, use the given default capacity
  return defaultCapacity;
}
