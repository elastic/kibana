/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fork } from 'child_process';
import { resolve } from 'path';
import uuid from 'uuid/v4';
import { serializeProvider } from '../../../../common/lib/serialize';
import { populateServerRegistries } from '../../populate_server_registries';

const serialization = populateServerRegistries(['types']).then(({ types }) =>
  serializeProvider(types.toJS())
);

const WORKER_TIMEOUT = 10000;

const heap = {};
let worker = null;

function getWorker() {
  if (worker) return worker;
  const workerPath = resolve(__dirname, 'babeled.js');
  worker = fork(workerPath, {});

  // 'exit' happens whether we kill the worker or it just dies. No need to look for 'error', our worker is intended to be long lived so it isn't running, it's an issue
  worker.on('exit', () => {
    worker = null;
    worker = getWorker();
  });

  worker.on('message', msg => {
    const { type, value, id } = msg;
    if (type === 'run') {
      // TODO: deserialize
      const { threadId } = msg;
      const { ast, context } = value;
      heap[threadId].onFunctionNotFound(ast, context).then(value => {
        worker.send({ type: 'result', id, value: value });
      });
    }
    if (type === 'result') {
      if (!heap[id]) console.log('Got response from timed out request', id);
      else heap[id].resolve(value);

      delete heap[id];
    }

    if (type === 'error') throw new Error(value);
  });
  return worker;
}

// Tip: This can return a promise
export const thread = ({ onFunctionNotFound }) => {
  const functionList = new Promise(resolve => {
    const worker = getWorker();
    worker.send({ type: 'getFunctions' });
    worker.on('message', msg => {
      if (msg.type === 'functionList') resolve(msg.value);
    });
  });
  return Promise.all([functionList, serialization]).then(([functions, serialization]) => {
    const { serialize, deserialize } = serialization;

    return {
      interpret: (ast, context) => {
        const worker = getWorker();
        const id = uuid();
        worker.send({ type: 'run', id, value: { ast, context: serialize(context) } });

        return new Promise(resolve => {
          heap[id] = {
            time: new Date().getTime(),
            resolve: value => resolve(deserialize(value)),
            onFunctionNotFound: (ast, context) =>
              onFunctionNotFound(ast, deserialize(context)).then(serialize),
          };

          //
          setTimeout(() => {
            if (!heap[id]) return; // Looks like this has already been cleared from the heap.
            heap[id].resolve({
              type: 'error',
              error: {
                message: `Request timed out.`,
              },
            });
            if (worker) worker.kill();
          }, WORKER_TIMEOUT);
        });
      },

      getFunctions: () => functions,
    };
  });
};
