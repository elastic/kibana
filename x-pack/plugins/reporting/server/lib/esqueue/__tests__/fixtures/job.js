/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import events from 'events';

export class JobMock extends events.EventEmitter {
  constructor(queue, index, type, payload, options = {}) {
    super();

    this.queue = queue;
    this.index = index;
    this.jobType = type;
    this.payload = payload;
    this.options = options;
  }

  getProp(name) {
    return this[name];
  }
}
