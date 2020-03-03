/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class BatchQueue {
  private queue: Set<string> = new Set();

  constructor(items: string[]) {
    this.enqueue(items);
  }

  private runChecks(items: string[]): void {
    const errors: string[] = [];
    items.forEach(item => {
      if (this.queue.has(item)) {
        errors.push(item);
      }
    });

    if (errors.length) {
      throw new Error(`The following item(s) are already enqueued: [${[errors.join(', ')]}]`);
    }
  }

  public enqueue(items: string[]): void {
    this.runChecks(items);
    items.forEach(item => {
      this.queue.add(item);
    });
  }

  public readNextItem(): string | undefined {
    return this.toArray()[0];
  }

  public toArray(): string[] {
    return Array.from(this.queue.values());
  }

  public shiftQueue(): string | undefined {
    const nextItem = this.readNextItem();
    if (nextItem) {
      this.queue.delete(nextItem);
      return nextItem;
    }
    return;
  }

  public has(item: string): boolean {
    return this.queue.has(item);
  }

  public size() {
    return this.queue.size;
  }
}

export const createBatchQueue = (items: string[]): BatchQueue => {
  return new BatchQueue(items);
};
