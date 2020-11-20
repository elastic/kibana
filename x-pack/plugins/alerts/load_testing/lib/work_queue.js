/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { delay, times } = require('./utils');

module.exports = {
  runQueue,
};

/**
 * @template I, O
 * @type { (queue: I[], concurrent: number, fn: (i: I, worker: number) => Promise<O>) => Promise<O[]> }
 */
async function runQueue(queue, concurrent, fn) {
  /** @type { {i: I, o: O | undefined }[] } */
  const workQueue = queue.map((i) => ({ i: i, o: undefined }));
  const resultsQueue = workQueue.slice();

  /** @type { Promise<any>[] } */
  const workersP = [];
  times(concurrent, (i) => {
    workersP.push(worker(i, workQueue, fn));
  });

  await Promise.all(workersP);

  return resultsQueue.map((w) => w.o);
}

/**
 * @template I, O
 * @type { (id: number, queue: {i: I, o: O}[], fn: (i: I, id: number) => Promise<O>) => Promise<void> }
 */
async function worker(id, queue, fn) {
  while (queue.length !== 0) {
    const work = queue.shift();

    // more readable on debug if worker id starts at 1
    work.o = await fn(work.i, id + 1);
  }
}

// @ts-ignore
if (require.main === module) test();

async function test() {
  const { arrayFrom } = require('./utils');

  const input = arrayFrom(10, (n) => n);
  const output = await runQueue(input, 3, fn);

  console.log('input: ', input);
  console.log('output:', output);

  /** @type { (n: number, worker: number) => Promise<number> } */
  async function fn(n, worker) {
    console.log(`${new Date().toISOString()} ${worker}: starting ${n}`);
    await delay(2 * worker);
    console.log(`${new Date().toISOString()} ${worker}: finished ${n}`);
    return n * n;
  }
}
