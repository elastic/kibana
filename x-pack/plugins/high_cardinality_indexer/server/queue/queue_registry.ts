/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueueObject } from 'async';
import { Doc } from '../../common/types';

export class QueueRegistry {
  private queues: Array<QueueObject<Doc>> = [];

  public registerQueue(queue: QueueObject<Doc>) {
    this.queues.push(queue);
  }

  public getQueues() {
    return Object.values(this.queues);
  }

  public stopQueues() {
    this.queues.forEach((queue) => queue.kill());

    this.queues = [];
  }
}
