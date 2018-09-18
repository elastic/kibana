/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid/v4';
export const browser = config => {
  // Note that we need to be careful about how many times routeExpressionProvider is called, because of the socket.once below.
  // It's too bad we can't get a list of browser plugins on the server
  const { socket, serialize, deserialize } = config;
  const functions = new Promise(resolve => {
    socket.emit('getFunctionList');
    socket.once('functionList', resolve);
  });

  return functions.then(functions => {
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

          // TODO serialize is not working here, probably because the registry is empty. We should probably pass serialize and deserialize in
          socket.emit('run', { ast, context: serialize(context), id });
        });
      },
      getFunctions: () => Object.keys(functions),
    };
  });
};
