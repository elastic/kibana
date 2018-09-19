/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid/v4';
import { serializeProvider } from '../../../common/lib/serialize';
import { populateServerRegistries } from '../populate_server_registries';

const serialization = populateServerRegistries(['types']).then(({ types }) =>
  serializeProvider(types.toJS())
);

export const browser = ({ socket }) => {
  // Note that we need to be careful about how many times routeExpressionProvider is called, because of the socket.once below.
  // It's too bad we can't get a list of browser plugins on the server
  const functions = new Promise(resolve => {
    socket.emit('getFunctionList');
    socket.once('functionList', resolve);
  });

  return Promise.all([functions, serialization]).then(([functions, serialization]) => {
    const { serialize, deserialize } = serialization;
    return {
      interpret: (ast, context) => {
        return new Promise((resolve, reject) => {
          const id = uuid();
          const listener = resp => {
            if (resp.error) {
              // cast error strings back into error instances
              const err = resp.error instanceof Error ? resp.error : new Error(resp.error);
              if (resp.stack) err.stack = resp.stack;
              reject(err);
            } else {
              resolve(deserialize(resp.value));
            }
          };

          socket.once(`resp:${id}`, listener);

          socket.emit('run', { ast, context: serialize(context), id });
        });
      },
      getFunctions: () => Object.keys(functions),
    };
  });
};
