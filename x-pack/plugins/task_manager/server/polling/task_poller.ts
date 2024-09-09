/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * This module contains the logic for polling the task manager index for new work.
 */

import { Observable, Subject } from 'rxjs';

import { Option, none } from 'fp-ts/lib/Option';
import { Logger } from '@kbn/core/server';
import { TaskErrorSource } from '../task_running';
import { Result, asOk, asErr } from '../lib/result_type';

type WorkFn<H> = () => Promise<H>;

interface Opts<H> {
  logger: Logger;
  initialPollInterval: number;
  pollInterval$: Observable<number>;
  pollIntervalDelay$?: Observable<number>;
  getCapacity: () => number;
  work: WorkFn<H>;
}

/**
 * constructs a new TaskPoller stream, which emits events on demand and on a scheduled interval, waiting for capacity to be available before emitting more events.
 *
 * @param opts
 * @prop {number} pollInterval - How often, in milliseconds, we will an event be emnitted, assuming there's capacity to do so
 * @prop {() => number} getCapacity - A function specifying whether there is capacity to emit new events
 * @prop {() => Promise<H>} work - The worker we wish to execute in order to `poll`
 *
 * @returns {Observable<Set<T>>} - An observable which emits an event whenever a polling event is due to take place, providing access to a singleton Set representing a queue
 *  of unique request argumets of type T.
 */
export function createTaskPoller<T, H>({
  logger,
  initialPollInterval,
  pollInterval$,
  pollIntervalDelay$,
  getCapacity,
  work,
}: Opts<H>): {
  start: () => void;
  stop: () => void;
  events$: Observable<Result<H, PollingError<T>>>;
} {
  const hasCapacity = () => getCapacity() > 0;
  let running: boolean = false;
  let timeoutId: NodeJS.Timeout | null = null;
  let hasSubscribed: boolean = false;
  let pollInterval = initialPollInterval;
  let pollIntervalDelay = 0;
  const subject = new Subject<Result<H, PollingError<T>>>();

  async function runCycle() {
    timeoutId = null;
    const start = Date.now();
    if (hasCapacity()) {
      try {
        const result = await work();
        subject.next(asOk(result));
      } catch (e) {
        subject.next(asPollingError<T>(e, PollingErrorType.WorkError));
      }
    }
    if (running) {
      // Set the next runCycle call
      timeoutId = setTimeout(
        () => runCycle().catch(() => {}),
        Math.max(pollInterval - (Date.now() - start) + (pollIntervalDelay % pollInterval), 0)
      );
      // Reset delay, it's designed to shuffle only once
      pollIntervalDelay = 0;
    }
  }

  function subscribe() {
    if (hasSubscribed) {
      return;
    }
    pollInterval$.subscribe((interval) => {
      if (!Number.isSafeInteger(interval) || interval < 0) {
        // TODO: Investigate why we sometimes get null / NaN, causing the setTimeout logic to always schedule
        // the next polling cycle to run immediately. If we don't see occurrences of this message by December 2024,
        // we can remove the TODO and/or check because we now have a cap to how much we increase the poll interval.
        logger.error(
          new Error(
            `Expected the new interval to be a number > 0, received: ${interval} but poller will keep using: ${pollInterval}`
          )
        );
        return;
      }
      pollInterval = interval;
      logger.debug(`Task poller now using interval of ${interval}ms`);
    });
    if (pollIntervalDelay$) {
      pollIntervalDelay$.subscribe((delay) => {
        pollIntervalDelay = delay;
        logger.debug(`Task poller now delaying emission by ${delay}ms`);
      });
    }
    hasSubscribed = true;
  }

  return {
    events$: subject,
    start: () => {
      if (!running) {
        running = true;
        runCycle().catch(() => {});
        // We need to subscribe shortly after start. Otherwise, the observables start emiting events
        // too soon for the task run statistics module to capture.
        setTimeout(() => subscribe(), 0);
      }
    },
    stop: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      running = false;
    },
  };
}

export enum PollingErrorType {
  WorkError,
  WorkTimeout,
  RequestCapacityReached,
}

function asPollingError<T>(err: string | Error, type: PollingErrorType, data: Option<T> = none) {
  return asErr(new PollingError<T>(`Failed to poll for work: ${err}`, type, data));
}

export class PollingError<T> extends Error {
  public readonly type: PollingErrorType;
  public readonly data: Option<T>;
  public readonly source: TaskErrorSource;
  constructor(message: string, type: PollingErrorType, data: Option<T>) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.type = type;
    this.data = data;
    this.source = TaskErrorSource.FRAMEWORK;
  }
}
