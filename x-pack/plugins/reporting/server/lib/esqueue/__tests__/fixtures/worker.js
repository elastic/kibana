/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import events from 'events';

export class WorkerMock extends events.EventEmitter {
  constructor(queue, type, workerFn, opts = {}) {
    super();

    this.queue = queue;
    this.type = type;
    this.workerFn = workerFn;
    this.options = opts;
  }

  getProp(name) {
    return this[name];
  }
}
