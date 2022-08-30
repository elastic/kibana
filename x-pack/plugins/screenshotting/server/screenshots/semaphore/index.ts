/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type { OperatorFunction } from 'rxjs';
import { finalize } from 'rxjs/operators';

type Task = () => void;

export class Semaphore {
  private queue: Task[] = [];

  constructor(private capacity: number) {
    this.release = this.release.bind(this);
  }

  acquire<T>(): OperatorFunction<T, T> {
    return (inner) =>
      new Observable((outer) => {
        const task = () => {
          /**
           * outer.remove(cancel);
           *
           * @todo Uncomment the line above when RxJS is bumped to at least 6.6.3.
           * @see https://github.com/ReactiveX/rxjs/pull/5659
           */

          outer.add(inner.pipe(finalize(this.release)).subscribe(outer));
        };
        const cancel = this.cancel.bind(this, task);

        outer.add(cancel);
        this.schedule(task);
      });
  }

  protected release(): void {
    this.capacity++;
    this.next();
  }

  private next() {
    if (this.capacity <= 0 || !this.queue.length) {
      return;
    }

    const task = this.queue.shift()!;
    this.capacity--;

    task();
  }

  private schedule(task: Task) {
    this.queue.push(task);
    this.next();
  }

  private cancel(task: Task) {
    const index = this.queue.indexOf(task);
    if (index < 0) {
      return;
    }

    this.queue.splice(index, 1);
  }
}
