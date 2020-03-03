/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BatchQueue } from './batch_queue';

describe('BatchQueues', () => {
  test('addItems', () => {
    const myItems = ['a', 'b'];
    const batchQueue = new BatchQueue();
    batchQueue.addItems(myItems);
    const queue = batchQueue.getQueue();
    expect(queue).toEqual(myItems);
  });

  test('readNextItem and shiftQueue', () => {
    const myItems = ['a', 'b'];

    const batchQueue = new BatchQueue();
    expect(batchQueue.readNextItem()).toBeUndefined();
    batchQueue.addItems(myItems);

    expect(batchQueue.readNextItem()).toBe('a');
    // Second read yields same item
    expect(batchQueue.readNextItem()).toBe('a');

    expect(batchQueue.shiftQueue()).toBe('a');
    expect(batchQueue.shiftQueue()).toBe('b');
    expect(batchQueue.shiftQueue()).toBe(undefined);
  });

  it('prevents adding items that have already been queued', () => {
    const myItemsA = ['s', 't'];
    const myItemsB = ['s', 't', 'u'];
    const batchQueues = new BatchQueue();
    batchQueues.addItems(myItemsA);
    try {
      batchQueues.addItems(myItemsB);
    } catch (e) {
      expect(e.message).toMatchSnapshot();
      return;
    }
    fail('Adding duplicate items to batch queues did not throw!');
  });
});
