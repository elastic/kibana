/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file,@typescript-eslint/no-explicit-any */

import { ToolingLog } from '@kbn/tooling-log';
import { isPromise } from '@kbn/std';
import moment from 'moment';

interface UsageRecordJson {
  id: string;
  start: string;
  finish: string;
  duration: string;
  status: 'success' | 'failure' | 'pending';
  error?: string;
}

interface UsageTrackerOptions {
  logger?: ToolingLog;
  dumpOnProcessExit?: boolean;
  maxRecordsPerType?: number;
}

/**
 * Keep track of usage of stuff. Example: can track how many time a given utility/function was called.
 *
 * ** Should not be used for production code **
 */
export class UsageTracker {
  private readonly records: Record<
    string,
    {
      count: number;
      records: UsageRecord[];
    }
  > = {};
  private readonly options: Required<UsageTrackerOptions>;
  private wrappedCallbacks = new WeakSet<Function>();

  constructor({
    logger = new ToolingLog({ level: 'info', writeTo: process.stdout }),
    dumpOnProcessExit = false,
    maxRecordsPerType = 25,
  }: UsageTrackerOptions = {}) {
    this.options = {
      logger,
      dumpOnProcessExit,
      maxRecordsPerType,
    };

    try {
      if (dumpOnProcessExit && process && process.once) {
        ['SIGINT', 'exit', 'uncaughtException', 'unhandledRejection'].forEach((event) => {
          process.once(event, () => {
            logger?.debug(`Usage tracking:\n\n${this.toString()}`);
          });
        });
      }
    } catch (err) {
      logger.debug(`Unable to setup 'dumpOnProcessExit': ${err.message}`);
    }
  }

  create(id: string): UsageRecord {
    this.records[id] = this.records[id] ?? { count: 0, records: [] };

    const maxRecords = this.options.maxRecordsPerType;
    const usageRecord = new UsageRecord(id);
    const usageForId = this.records[id];

    usageForId.count++;
    usageForId.records.push(usageRecord);

    if (usageForId.records.length > maxRecords) {
      usageForId.records.splice(0, usageForId.records.length - maxRecords);
    }

    return usageRecord;
  }

  toJSON(): UsageRecordJson[] {
    return Object.values(this.records)
      .map(({ records }) => records)
      .flat()
      .map((record) => record.toJSON());
  }

  toString(): string {
    return JSON.stringify(this.toJSON());
  }

  public dump(logger?: ToolingLog) {
    (logger ?? this.options.logger).info(
      Object.entries(this.records)
        .map(([key, { count, records: usageRecords }]) => {
          return `
  [${key}] Invoked ${count} times. Last ${this.options.maxRecordsPerType}:
      ${usageRecords
        .map((record) => {
          return record.toString();
        })
        .join('\n      ')}
`;
        })
        .join('\n')
    );
  }

  /**
   * Will wrap the provided callback and provide usage tracking on it.
   * @param callback
   * @param name
   */
  public track<F extends (...args: any) => any = (...args: any) => any>(
    callback: F,
    name?: string
  ): F {
    if (this.wrappedCallbacks.has(callback)) {
      return callback;
    }

    const functionName =
      name ??
      callback.name ??
      (new Error('-').stack ?? '').split('\n')[2] ??
      callback.toString().substring(0, 50);

    const wrappedFunction = ((...args) => {
      const usageRecord = this.create(functionName);

      try {
        const response = callback(...args);

        if (isPromise(response)) {
          response
            .then(() => {
              usageRecord.set('success');
            })
            .catch((e) => {
              usageRecord.set('failure', e.message);
            });
        } else {
          usageRecord.set('success');
        }

        return response;
      } catch (e) {
        usageRecord.set('failure', e.message);
        throw e;
      }
    }) as F;

    this.wrappedCallbacks.add(wrappedFunction);

    return wrappedFunction;
  }
}

class UsageRecord {
  private start: UsageRecordJson['start'] = new Date().toISOString();
  private finish: UsageRecordJson['finish'] = '';
  private duration: UsageRecordJson['duration'] = '';
  private status: UsageRecordJson['status'] = 'pending';
  private error: UsageRecordJson['error'];

  constructor(private readonly id: string) {}

  set(status: Exclude<UsageRecordJson['status'], 'pending'>, error?: string) {
    this.finish = new Date().toISOString();
    this.error = error;
    this.status = status;

    const durationDiff = moment.duration(moment(this.finish).diff(this.start));

    this.duration = `h[ ${durationDiff.hours()} ]  m[ ${durationDiff.minutes()} ]  s[ ${durationDiff.seconds()} ]  ms[ ${durationDiff.milliseconds()} ]`;
  }

  public toJSON(): UsageRecordJson {
    const { id, start, finish, status, error, duration } = this;

    return {
      id,
      start,
      finish,
      duration,
      status,
      ...(error ? { error } : {}),
    };
  }

  public toString(): string {
    return JSON.stringify(this.toJSON());
  }
}

export const usageTracker = new UsageTracker({ dumpOnProcessExit: true });
