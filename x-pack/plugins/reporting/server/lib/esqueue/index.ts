/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Client } from 'elasticsearch';
import { EventEmitter } from 'events';
import { omit } from 'lodash';
import { unitOfTime } from 'moment';
import { constants } from './constants';
import { createClient } from './helpers/create_client';
import { indexTimestamp } from './helpers/index_timestamp';
import { Job } from './job';
import { Worker, WorkerFunc, WorkerOptions } from './worker';

export { events } from './constants/events';

export type Logger = (...rest: any[]) => any;

interface EsqueueSettings {
  interval: unitOfTime.StartOf;
  timeout: number;
  doctype: string;
  dateSeparator: string;
  indexSettings: any;
}

interface EsqueueOptions {
  interval?: unitOfTime.StartOf;
  timeout?: number;
  doctype?: string;
  dateSeparator?: string;
  client?: Client;
  logger?: Logger;
}

// tslint:disable-next-line
function noop() {}

export class Esqueue extends EventEmitter {
  public readonly index: string;
  public readonly settings: EsqueueSettings;
  public readonly client: Client;

  private readonly logger: Logger;
  private workers: Worker[];

  constructor(index: string, options: EsqueueOptions = {}) {
    if (!index) {
      throw new Error('Must specify an index to write to');
    }

    super();
    this.index = index;
    this.settings = {
      interval: constants.DEFAULT_SETTING_INTERVAL,
      timeout: constants.DEFAULT_SETTING_TIMEOUT,
      doctype: constants.DEFAULT_SETTING_DOCTYPE,
      dateSeparator: constants.DEFAULT_SETTING_DATE_SEPARATOR,
      ...omit(options, ['client']),
    };
    this.client = createClient(options.client || {});
    this.logger = options.logger || noop;
    this.workers = [];
    this._initTasks().catch(err => this.emit(constants.EVENT_QUEUE_ERROR, err));
  }

  public addJob(type: string, payload: any, opts = {}) {
    const timestamp = indexTimestamp(this.settings.interval, this.settings.dateSeparator);
    const index = `${this.index}-${timestamp}`;
    const defaults = {
      timeout: this.settings.timeout,
    };

    const options = Object.assign(defaults, opts, {
      doctype: this.settings.doctype,
      indexSettings: this.settings.indexSettings,
      logger: this.logger,
    });

    return new Job(this, index, type, payload, options);
  }

  public registerWorker(type: string, workerFn: WorkerFunc, opts: WorkerOptions) {
    const worker = new Worker(this, type, workerFn, { ...opts, logger: this.logger });
    this.workers.push(worker);
    return worker;
  }

  public getWorkers() {
    return this.workers.map(fn => fn);
  }

  public destroy() {
    const workers = this.workers.filter(worker => worker.destroy());
    this.workers = workers;
  }

  private _initTasks() {
    const initTasks = [this.client.ping({})];

    return Promise.all(initTasks).catch(err => {
      this.logger(['initTasks', 'error'], err);
      throw err;
    });
  }
}
