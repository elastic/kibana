/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line max-classes-per-file
import {
  EMPTY,
  MonoTypeOperatorFunction,
  Observable,
  Operator,
  Subscriber,
  TeardownLogic,
} from 'rxjs';

/**
 * Emits only the first `count` items from the arrays emitted by the source Observable. The limit
 * is global to all emitted values, and not per emission.
 *
 * @example
 * ```ts
 * const source = of([1, 2], [3, 4], [5, 6]);
 * const takeThreeInArray = source.pipe(takeInArray(3));
 * takeThreeInArray.subscribe(x => console.log(x));
 *
 * // Logs:
 * // [1,2]
 * // [3]
 * ```
 *
 * @param count The total maximum number of value to keep from the emitted arrays
 */
export function takeInArray<T>(count: number): MonoTypeOperatorFunction<T[]> {
  return function takeLastOperatorFunction(source: Observable<T[]>): Observable<T[]> {
    if (count === 0) {
      return EMPTY;
    } else {
      return source.lift(new TakeInArray(count));
    }
  };
}

class TakeInArray<T> implements Operator<T[], T[]> {
  constructor(private total: number) {
    if (this.total < 0) {
      throw new Error('Cannot take a negative number of items');
    }
  }

  call(subscriber: Subscriber<T[]>, source: any): TeardownLogic {
    return source.subscribe(new TakeInArraySubscriber(subscriber, this.total));
  }
}

class TakeInArraySubscriber<T> extends Subscriber<T[]> {
  private current: number = 0;

  constructor(destination: Subscriber<T>, private total: number) {
    super(destination);
  }

  protected _next(value: T[]): void {
    const remaining = this.total - this.current;
    if (remaining > value.length) {
      this.destination.next!(value);
      this.current += value.length;
    } else {
      this.destination.next!(value.slice(0, remaining));
      this.destination.complete!();
      this.unsubscribe();
    }
  }
}
