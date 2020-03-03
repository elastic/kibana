/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BatchQueues } from './batch_queues';

describe('BatchQueues', () => {
  test('addQueue', () => {
    const myQueue = ['a', 'b'];
    const batchQueues = new BatchQueues();
    batchQueues.addQueue(myQueue);
    const queues = batchQueues.getQueues();
    expect(queues[0].items).toEqual(myQueue);
  });

  test('readNextQueueItem and shiftQueue', () => {
    const myQueue = ['a', 'b'];

    const batchQueues = new BatchQueues();
    expect(batchQueues.readNextQueueItem('nada')).toBeUndefined();
    const id = batchQueues.addQueue(myQueue);

    expect(batchQueues.readNextQueueItem(id)).toBe('a');
    // Second read yields same item
    expect(batchQueues.readNextQueueItem(id)).toBe('a');

    expect(batchQueues.shiftQueue(id)).toBe('a');
    expect(batchQueues.shiftQueue(id)).toBe('b');
    expect(batchQueues.shiftQueue(id)).toBe(undefined);

    expect(() => batchQueues.shiftQueue('nada')).toThrow('No queue found');
  });

  test('deleteQueue', () => {
    const myQueue = ['a', 'b'];
    const batchQueues = new BatchQueues();
    expect(batchQueues.deleteQueue('nothing')).toBe(false);
    const id = batchQueues.addQueue(myQueue);
    expect(batchQueues.deleteQueue(id)).toBe(true);
  });

  test('findItemQueue', () => {
    const myQueueA = ['a', 'b'];
    const myQueueB = ['s', 't'];
    const batchQueues = new BatchQueues();
    batchQueues.addQueue(myQueueA);
    batchQueues.addQueue(myQueueB);

    expect(batchQueues.findItemQueue('s')!.items).toEqual(myQueueB);
  });

  it('prevents adding items that have already been queued', () => {
    const myQueueA = ['s', 't'];
    const myQueueB = ['s', 't', 'u'];
    const batchQueues = new BatchQueues();
    batchQueues.addQueue(myQueueA);
    try {
      batchQueues.addQueue(myQueueB);
    } catch (e) {
      expect(e.message).toMatchSnapshot();
      return;
    }
    fail('Adding duplicate items to batch queues did not throw!');
  });
});
