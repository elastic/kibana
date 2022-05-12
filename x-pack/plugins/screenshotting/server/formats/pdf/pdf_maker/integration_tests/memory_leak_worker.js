/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const { isMainThread, resourceLimits } = require('worker_threads');

// Give Node.js a chance to move the memory to the old generation region
const WAIT = 40;

const allocateMemory = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        new Array(resourceLimits.maxYoungGenerationSizeMb * 1024 * 1024)
          .fill('')
          .map((_, idx) => idx) // more unique values prevent aggressive memory compression and hits mem limits faster
      );
    }, WAIT);
  });
};

if (!isMainThread) {
  (async function run() {
    const memoryLeak = [];
    for (;;) /* a computer crying */ {
      memoryLeak.push(await allocateMemory());
    }
  })();
}
