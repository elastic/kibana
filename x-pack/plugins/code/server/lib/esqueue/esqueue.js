/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Borrowed from https://github.com/elastic/kibana/tree/master/x-pack/plugins/reporting/server/lib/esqueue
 * TODO(mengwei): need to abstract this esqueue as a common library when merging into kibana's main repo.
 */

import { EventEmitter } from 'events';
import { Job } from './job';
import { Worker } from './worker';
import { constants } from './constants';
import { indexTimestamp } from './helpers/index_timestamp';

function omit(obj, keysToOmit) {
  return Object.keys(obj).reduce((acc, key) => (
    keysToOmit.includes(key) ? acc : { ...acc, [key]: obj[key] }
  ), {});
}

export class Esqueue extends EventEmitter {
  constructor(index, options = {}) {
    if (!index) throw new Error('Must specify an index to write to');

    super();
    this.index = index;
    this.settings = {
      interval: constants.DEFAULT_SETTING_INTERVAL,
      timeout: constants.DEFAULT_SETTING_TIMEOUT,
      dateSeparator: constants.DEFAULT_SETTING_DATE_SEPARATOR,
      ...omit(options, ['client'])
    };
    this.client = options.client;
    this._logger = options.logger || function () {};
    this._workers = [];
    this._initTasks().catch((err) => this.emit(constants.EVENT_QUEUE_ERROR, err));
  }

  _initTasks() {
    const initTasks = [
      this.client.ping(),
    ];

    return Promise.all(initTasks).catch((err) => {
      this._logger(err, ['initTasks', 'error']);
      throw err;
    });
  }

  addJob(type, payload, opts = {}) {
    const timestamp = indexTimestamp(this.settings.interval, this.settings.dateSeparator);
    const index = `${this.index}-${timestamp}`;
    const defaults = {
      timeout: this.settings.timeout,
    };

    const options = Object.assign(defaults, opts, {
      indexSettings: this.settings.indexSettings,
      logger: this._logger
    });

    return new Job(this, index, type, payload, options);
  }

  registerWorker(type, workerFn, opts) {
    const worker = new Worker(this, type, workerFn, { ...opts, logger: this._logger });
    this._workers.push(worker);
    return worker;
  }

  getWorkers() {
    return this._workers.map((fn) => fn);
  }

  destroy() {
    const workers = this._workers.filter((worker) => worker.destroy());
    this._workers = workers;
  }
}
