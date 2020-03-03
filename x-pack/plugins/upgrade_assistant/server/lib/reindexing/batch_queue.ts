/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class BatchQueue {
  private queue: string[] = [];

  private runChecks(items: string[]): void {
    const errors: string[] = [];
    items.forEach(item => {
      if (this.queue.includes(item)) {
        errors.push(item);
      }
    });

    if (errors.length) {
      throw new Error(`The following item(s) are already enqueued: [${[errors.join(', ')]}]`);
    }
  }

  public addItems(items: string[]): void {
    this.runChecks(items);
    items.forEach(item => {
      this.queue.push(item);
    });
  }

  public readNextItem(): string | undefined {
    return this.queue[0];
  }

  public getQueue(): string[] {
    return this.queue.slice();
  }

  public shiftQueue(): string | undefined {
    return this.queue.shift();
  }

  public has(item: string): boolean {
    return this.queue.includes(item);
  }

  public size() {
    return this.queue.length;
  }
}
