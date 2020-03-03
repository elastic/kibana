/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { v4 as uuid } from 'uuid';

interface Queue {
  id: string;
  items: string[];
}

export class BatchQueues {
  private queues: Map<string, Queue> = new Map();

  private requireQueue(id: string): Queue {
    if (this.queues.has(id)) {
      return this.queues.get(id)!;
    }
    throw new Error(`No queue found with id ${id}`);
  }

  private runChecks(queue: string[]): void {
    const errorItems: string[] = [];
    queue.forEach(item => {
      const maybeQueue = this.findItemQueue(item);
      if (maybeQueue) {
        errorItems.push(item);
      }
    });

    if (errorItems.length) {
      throw new Error(`The following item(s) are already enqueued: [${[errorItems.join(', ')]}]`);
    }
  }

  public getQueue(id: string): Queue | undefined {
    return this.queues.get(id);
  }

  public addQueue(queue: string[]): string {
    this.runChecks(queue);
    const id = uuid();
    this.queues.set(id, {
      id,
      items: queue,
    });

    return id;
  }

  public getQueues(): Queue[] {
    return Array.from(this.queues.values());
  }

  public readNextQueueItem(id: string): string | undefined {
    const queue = this.getQueue(id);
    if (queue) {
      return queue.items[0];
    }
  }

  public shiftQueue(id: string): string | undefined {
    return this.requireQueue(id).items.shift();
  }

  public deleteQueue(id: string): boolean {
    return this.queues.delete(id);
  }

  public findItemQueue(item: string): Queue | undefined {
    return this.getQueues().find(queue => {
      return queue.items.find(i => i === item);
    });
  }
}
