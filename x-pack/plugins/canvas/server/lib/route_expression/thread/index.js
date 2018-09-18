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

// Start our workers in global space
const workerPath = resolve(__dirname, 'babeled.js');
const worker = fork(workerPath, {});
const functionList = new Promise(resolve => {
  worker.send({ type: 'getFunctions' });
  worker.on('message', msg => {
    if (msg.type === 'functionList') resolve(msg.value);
  });
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
    // TODO: deserialize
    heap[id].resolve(value);
    delete heap[id];
  }

  if (type === 'error') throw new Error(value);
});

// Tip: This can return a promise
export const thread = ({ onFunctionNotFound }) => {
  return Promise.all([functionList, serialization]).then(([functions, serialization]) => {
    const { serialize, deserialize } = serialization;

    return {
      interpret: (ast, context) => {
        const id = uuid();
        worker.send({ type: 'run', id, value: { ast, context: serialize(context) } });

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
