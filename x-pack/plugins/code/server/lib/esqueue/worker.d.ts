/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventEmitter } from 'events';

import { events } from './constants/events';
import { Esqueue } from './esqueue';
import { CancellationToken } from './helpers/cancellation_token';
import { Job } from './job';
import { AnyObject, EsClient, LogFn } from './misc';

type Handler<A> = (arg: A) => void;

interface JobInfo {
  index: string;
  type: string;
  id: string;
}

interface WorkerInfo {
  id: string;
  index: string;
  jobType: string;
}

interface ErrorInfo {
  error: Error;
  worker: WorkerInfo;
  job: JobInfo;
}

interface ErrorInfoNoJob {
  error: Error;
  worker: WorkerInfo;
}

type WorkerOutput<T = any> = {
  content: T;
  content_type: string;
  max_size_reached?: any;
} | void;

export type WorkerFn<P, R extends WorkerOutput> = (
  payload: P,
  cancellationToken: CancellationToken
) => Promise<R>;

export interface WorkerOptions {
  interval: number;
  capacity: number;
  intervalErrorMultiplier: number;
  client?: EsClient;
  size?: number;
  logger?: LogFn;
}

export class Worker<P, O extends WorkerOutput> extends EventEmitter {
  public id: string;
  public queue: Esqueue;
  public client: EsClient;
  public jobType: string;
  public workerFn: WorkerFn<P, O>;
  public checkSize: number;
  constructor(queue: Esqueue, type: string, workerFn: WorkerFn<P, O>, opts: WorkerOptions);

  public destroy(): void;

  /**
   * Get a plain JavaScript object describing this worker
   */
  public toJSON(): {
    id: string;
    index: string;
    jobType: string;
  };

  public on(
    name: typeof events['EVENT_WORKER_COMPLETE'],
    h: Handler<{
      job: {
        index: string;
        type: string;
        id: string;
      };
      output: O;
    }>
  ): this;
  public on(name: typeof events['EVENT_WORKER_JOB_CLAIM_ERROR'], h: Handler<ErrorInfo>): this;
  public on(name: typeof events['EVENT_WORKER_JOB_SEARCH_ERROR'], h: Handler<ErrorInfoNoJob>): this;
  public on(
    name: typeof events['EVENT_WORKER_JOB_FAIL'],
    h: Handler<{ job: JobInfo; worker: WorkerInfo; output: O }>
  ): this;
  public on(name: string, ...args: any[]): this;
}
