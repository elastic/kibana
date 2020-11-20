/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createBoundedQueue } from './bounded_queue';
import { loggingSystemMock } from 'src/core/server/mocks';

const loggingService = loggingSystemMock.create();
const logger = loggingService.get();

describe('basic', () => {
  let discardedHelper: DiscardedHelper<number>;
  let onDiscarded: (object: number) => void;
  let queue2: ReturnType<typeof createBoundedQueue>;
  let queue10: ReturnType<typeof createBoundedQueue>;

  beforeAll(() => {
    discardedHelper = new DiscardedHelper();
    onDiscarded = discardedHelper.onDiscarded.bind(discardedHelper);
  });

  beforeEach(() => {
    queue2 = createBoundedQueue<number>({ logger, maxLength: 2, onDiscarded });
    queue10 = createBoundedQueue<number>({ logger, maxLength: 10, onDiscarded });
  });

  test('queued items: 0', () => {
    discardedHelper.reset();
    expect(queue2.isEmpty()).toEqual(true);
    expect(queue2.isFull()).toEqual(false);
    expect(queue2.isCloseToFull()).toEqual(false);
    expect(queue2.length).toEqual(0);
    expect(queue2.maxLength).toEqual(2);
    expect(queue2.pull(1)).toEqual([]);
    expect(queue2.pull(100)).toEqual([]);
    expect(discardedHelper.discarded).toEqual([]);
  });

  test('queued items: 1', () => {
    discardedHelper.reset();
    queue2.push(1);
    expect(queue2.isEmpty()).toEqual(false);
    expect(queue2.isFull()).toEqual(false);
    expect(queue2.isCloseToFull()).toEqual(false);
    expect(queue2.length).toEqual(1);
    expect(queue2.maxLength).toEqual(2);
    expect(queue2.pull(1)).toEqual([1]);
    expect(queue2.pull(1)).toEqual([]);
    expect(discardedHelper.discarded).toEqual([]);
  });

  test('queued items: 2', () => {
    discardedHelper.reset();
    queue2.push(1);
    queue2.push(2);
    expect(queue2.isEmpty()).toEqual(false);
    expect(queue2.isFull()).toEqual(true);
    expect(queue2.isCloseToFull()).toEqual(true);
    expect(queue2.length).toEqual(2);
    expect(queue2.maxLength).toEqual(2);
    expect(queue2.pull(1)).toEqual([1]);
    expect(queue2.pull(1)).toEqual([2]);
    expect(queue2.pull(1)).toEqual([]);
    expect(discardedHelper.discarded).toEqual([]);
  });

  test('queued items: 3', () => {
    discardedHelper.reset();
    queue2.push(1);
    queue2.push(2);
    queue2.push(3);
    expect(queue2.isEmpty()).toEqual(false);
    expect(queue2.isFull()).toEqual(true);
    expect(queue2.isCloseToFull()).toEqual(true);
    expect(queue2.length).toEqual(2);
    expect(queue2.maxLength).toEqual(2);
    expect(queue2.pull(1)).toEqual([2]);
    expect(queue2.pull(1)).toEqual([3]);
    expect(queue2.pull(1)).toEqual([]);
    expect(discardedHelper.discarded).toEqual([1]);
  });

  test('closeToFull()', () => {
    discardedHelper.reset();

    expect(queue10.isCloseToFull()).toEqual(false);

    for (let i = 1; i <= 8; i++) {
      queue10.push(i);
      expect(queue10.isCloseToFull()).toEqual(false);
    }

    queue10.push(9);
    expect(queue10.isCloseToFull()).toEqual(true);

    queue10.push(10);
    expect(queue10.isCloseToFull()).toEqual(true);

    queue10.pull(2);
    expect(queue10.isCloseToFull()).toEqual(false);

    queue10.push(11);
    expect(queue10.isCloseToFull()).toEqual(true);
  });

  test('discarded', () => {
    discardedHelper.reset();
    queue2.push(1);
    queue2.push(2);
    queue2.push(3);
    expect(discardedHelper.discarded).toEqual([1]);

    discardedHelper.reset();
    queue2.push(4);
    queue2.push(5);
    expect(discardedHelper.discarded).toEqual([2, 3]);
  });

  test('pull', () => {
    discardedHelper.reset();

    expect(queue10.pull(4)).toEqual([]);

    for (let i = 1; i <= 10; i++) {
      queue10.push(i);
    }

    expect(queue10.pull(4)).toEqual([1, 2, 3, 4]);
    expect(queue10.length).toEqual(6);
    expect(queue10.pull(4)).toEqual([5, 6, 7, 8]);
    expect(queue10.length).toEqual(2);
    expect(queue10.pull(4)).toEqual([9, 10]);
    expect(queue10.length).toEqual(0);
    expect(queue10.pull(1)).toEqual([]);
    expect(queue10.pull(4)).toEqual([]);
  });
});

class DiscardedHelper<T> {
  private _discarded: T[];

  constructor() {
    this.reset();
    this._discarded = [];
    this.onDiscarded = this.onDiscarded.bind(this);
  }

  onDiscarded(object: T) {
    this._discarded.push(object);
  }

  public get discarded(): T[] {
    return this._discarded;
  }

  reset() {
    this._discarded = [];
  }
}
