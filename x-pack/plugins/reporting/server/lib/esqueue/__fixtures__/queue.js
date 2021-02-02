/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import events from 'events';

export class QueueMock extends events.EventEmitter {
  constructor() {
    super();
  }

  setClient(client) {
    this.client = client;
  }
}
