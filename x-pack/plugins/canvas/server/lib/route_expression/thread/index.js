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

const heap = {};
let pingCount = 0;
let workerCount = 0;

function startWorker() {
  if (global._canvasWorker) return;
  workerCount++;
  console.log('STARTING WORKER', workerCount, 'MAIN PID', process.pid);
  // Start our workers in global space
  const workerPath = resolve(__dirname, 'babeled.js');
  global._canvasWorker = fork(workerPath, {});

  global._canvasWorker.on('message', msg => {
    const { type, value, id } = msg;
    if (type === 'pong') {
      console.log('GOT PONG', new Date());
      pingCount--;
    }

    if (type === 'run') {
      // TODO: deserialize
      const { threadId } = msg;
      const { ast, context } = value;
      heap[threadId].onFunctionNotFound(ast, context).then(value => {
        global._canvasWorker.send({ type: 'result', id, value: value });
      });
    }
    if (type === 'result') {
      heap[id].resolve(value);
      delete heap[id];
    }

    if (type === 'error') throw new Error(value);
  });
}
startWorker();

// This only needs to happen once, so it's fine if we don't re-do it after starting the first worker
const functionList = new Promise(resolve => {
  global._canvasWorker.send({ type: 'getFunctions' });
  global._canvasWorker.on('message', msg => {
    if (msg.type === 'functionList') resolve(msg.value);
  });
});

function ping() {
  if (pingCount > 1) {
    pingCount--;
    console.log('KILLING WORKER');
    global._canvasWorker.kill('SIGINT');
    global._canvasWorker = null;
    startWorker();
    /*
      worker fail
      - empty heap,
      - fail all expressions
      - respawn worker
    */
  }
  setTimeout(() => {
    global._canvasWorker.send({ type: 'ping' });
    pingCount++;
    ping();
  }, 5000);
}
ping();

// Tip: This can return a promise
export const thread = ({ onFunctionNotFound }) => {
  return Promise.all([functionList, serialization]).then(([functions, serialization]) => {
    // Start the worker down here so importing doesn't immediately cause it to start?

    const { serialize, deserialize } = serialization;

    return {
      interpret: (ast, context) => {
        const id = uuid();
        global._canvasWorker.send({ type: 'run', id, value: { ast, context: serialize(context) } });

        return new Promise(resolve => {
          heap[id] = {
            resolve: value => resolve(deserialize(value)),
            onFunctionNotFound: (ast, context) =>
              onFunctionNotFound(ast, deserialize(context)).then(serialize),
          };
        });
      },

      getFunctions: () => functions,
    };
  });
};
