/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventEmitter } from 'events';

import { events } from './constants/events';
import { Job, JobOptions } from './job';
import { AnyObject, EsClient, LogFn } from './misc';
import { Worker, WorkerFn, WorkerOptions, WorkerOutput } from './worker';

export class Esqueue extends EventEmitter {
  constructor(
    /**
     * The base name Esqueue will use for its time-based job indices in Elasticsearch. This
     * will have a date string appended to it to determine the actual index name.
     */
    index: string,
    options: {
      /**
       * The Elasticsearch client EsQueue will use to query ES and manage its queue indices
       */
      client: EsClient;

      /**
       * A function that Esqueue will call with log messages
       */
      logger?: LogFn;

      /**
       * Interval that Esqueue will use when creating its time-based job indices in Elasticsearch
       */
      interval?: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute';

      /**
       * Default job timeout
       */
      timeout?: number;

      /**
       * The value used to separate the parts of the date in index names created by Esqueue
       */
      dateSeparator?: string;

      /**
       * Arbitrary settings that will be merged with the default index settings EsQueue uses to
       * create elastcisearch indices
       */
      indexSettings?: AnyObject;
    }
  );

  public addJob<P, J = Job<P>>(type: string, payload: P, options: JobOptions): J;

  public registerWorker<P, R extends WorkerOutput, W = Worker<P, R>>(
    this: void,
    type: string,
    workerFn: WorkerFn<P, R>,
    opts?: Pick<WorkerOptions, Exclude<keyof WorkerOptions, 'logger'>>
  ): W;
  public destroy(): void;
}
