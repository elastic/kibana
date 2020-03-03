/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createBatchQueue } from './batch_queue';

describe('BatchQueues', () => {
  test('addItems', () => {
    const myItems = ['a', 'b'];
    const batchQueue = createBatchQueue(myItems);
    const queue = batchQueue.toArray();
    expect(queue).toEqual(myItems);
  });

  test('readNextItem and shiftQueue', () => {
    const myItems = ['a', 'b', 'a', 'c', 'd', 'e', 'e', 'e'];

    const batchQueue = createBatchQueue([]);
    expect(batchQueue.readNextItem()).toBeUndefined();
    batchQueue.enqueue(myItems);

    expect(batchQueue.readNextItem()).toBe('a');
    // Second read yields same item
    expect(batchQueue.readNextItem()).toBe('a');

    // Test order items, also items are deduped
    expect(batchQueue.shiftQueue()).toBe('a');
    expect(batchQueue.shiftQueue()).toBe('b');
    expect(batchQueue.shiftQueue()).toBe('c');
    expect(batchQueue.shiftQueue()).toBe('d');
    expect(batchQueue.shiftQueue()).toBe('e');
    expect(batchQueue.shiftQueue()).toBe(undefined);
  });

  it('prevents adding items that have already been queued', () => {
    const myItemsA = ['s', 't'];
    const myItemsB = ['s', 't', 'u'];
    const batchQueues = createBatchQueue([]);
    batchQueues.enqueue(myItemsA);
    try {
      batchQueues.enqueue(myItemsB);
    } catch (e) {
      expect(e.message).toMatchSnapshot();
      return;
    }
    fail('Adding duplicate items to batch queues did not throw!');
  });
});
