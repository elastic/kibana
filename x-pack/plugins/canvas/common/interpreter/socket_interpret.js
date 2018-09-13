/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid/v4';
import { getByAlias } from '../lib/get_by_alias';
import { serializeProvider } from '../lib/serialize';
import { interpretProvider } from './interpret';

/*
  Returns an interpet function that can shuttle partial ASTs and context between instances of itself over a socket
  This is the interpreter that gets called during interactive sessions in the browser and communicates with the
  same instance on the backend

  types: a registry of types
  functions: registry of known functions
  referableFunctions: An array, or a promise for an array, with a list of functions that are available to be defered to
  socket: the socket to communicate over
*/

export function socketInterpreterProvider({
  types,
  functions,
  handlers,
  referableFunctions,
  socket,
}) {
  // Return the interpet() function
  return interpretProvider({
    types,
    functions,
    handlers,

    onFunctionNotFound: (ast, context) => {
      // Get the name of the function that wasn't found
      const functionName = ast.chain[0].function;

      // Get the list of functions that are known elsewhere
      return Promise.resolve(referableFunctions).then(referableFunctionMap => {
        // Check if the not-found function is in the list of alternatives, if not, throw
        if (!getByAlias(referableFunctionMap, functionName))
          throw new Error(`Function not found: ${functionName}`);

        // set a unique message ID so the code knows what response to process
        const id = uuid();

        return new Promise((resolve, reject) => {
          const { serialize, deserialize } = serializeProvider(types);

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

          // Go run the remaining AST and context somewhere else, meaning either the browser or the server, depending on
          // where this file was loaded
          socket.emit('run', { ast, context: serialize(context), id });
        });
      });
    },
  });
}
