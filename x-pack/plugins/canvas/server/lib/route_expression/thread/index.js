/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fork } from 'child_process';
import { resolve } from 'path';
import uuid from 'uuid/v4';

// If the worker doesn't response in 10s, kill it.
const WORKER_TIMEOUT = 10000;
const workerPath = resolve(__dirname, 'babeled.js');
const heap = {};
let worker = null;

export function getWorker() {
  if (worker) return worker;
  worker = fork(workerPath, {});

  // 'exit' happens whether we kill the worker or it just dies.
  // No need to look for 'error', our worker is intended to be long lived so it isn't running, it's an issue
  worker.on('exit', () => {
    worker = null;
    // Restart immediately on exit since node takes a couple seconds to spin up
    worker = getWorker();
  });

  worker.on('message', msg => {
    const { type, value, id } = msg;
    if (type === 'run') {
      const { threadId } = msg;
      const { ast, context } = value;
      heap[threadId]
        .onFunctionNotFound(ast, context)
        .then(value => {
          worker.send({ type: 'msgSuccess', id, value: value });
        })
        .catch(e => heap[threadId].reject(e));
    }

    if (type === 'msgSuccess' && heap[id]) heap[id].resolve(value);

    // TODO: I don't think it is even possible to hit this
    if (type === 'msgError' && heap[id]) heap[id].reject(new Error(value));
  });

  return worker;
}

// All serialize/deserialize must occur in here. We should not return serialized stuff to the expressionRouter
export const thread = ({ onFunctionNotFound, serialize, deserialize }) => {
  const getWorkerFunctions = new Promise(resolve => {
    const worker = getWorker();
    worker.send({ type: 'getFunctions' });
    worker.on('message', msg => {
      if (msg.type === 'functionList') resolve(msg.value);
    });
  });

  return getWorkerFunctions.then(functions => {
    return {
      interpret: (ast, context) => {
        const worker = getWorker();
        const id = uuid();
        worker.send({ type: 'run', id, value: { ast, context: serialize(context) } });

        return new Promise((resolve, reject) => {
          heap[id] = {
            time: new Date().getTime(),
            resolve: value => {
              delete heap[id];
              resolve(deserialize(value));
            },
            reject: e => {
              delete heap[id];
              reject(e);
            },
            onFunctionNotFound: (ast, context) =>
              onFunctionNotFound(ast, deserialize(context)).then(serialize),
          };

          //
          setTimeout(() => {
            if (!heap[id]) return; // Looks like this has already been cleared from the heap.
            if (worker) worker.kill();

            // The heap will be cleared because the reject on heap will delete its own id
            heap[id].reject(new Error('Request timed out'));
          }, WORKER_TIMEOUT);
        });
      },

      getFunctions: () => functions,
    };
  });
};
