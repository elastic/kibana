/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { socketInterpreterProvider } from '../../common/interpreter/socket_interpret';
import { serializeProvider } from '../../common/lib/serialize';
import { socket } from '../socket';
import { typesRegistry } from '../../common/lib/types_registry';
import { createError } from '../../common/interpreter/create_error';
import { createHandlers } from './create_handlers';
import { functionsRegistry } from './functions_registry';
import { getBrowserRegistries } from './browser_registries';

// Create the function list
socket.emit('getFunctionList');
export const getServerFunctions = new Promise(resolve => socket.once('functionList', resolve));

// Use the above promise to seed the interpreter with the functions it can defer to
export function interpretAst(ast, context) {
  // Load plugins before attempting to get functions, otherwise this gets racey
  return Promise.all([getServerFunctions, getBrowserRegistries()])
    .then(([serverFunctionList]) => {
      return socketInterpreterProvider({
        types: typesRegistry.toJS(),
        handlers: createHandlers(socket),
        functions: functionsRegistry.toJS(),
        referableFunctions: serverFunctionList,
        socket: socket,
      });
    })
    .then(interpretFn => interpretFn(ast, context));
}

socket.on('run', ({ ast, context, id }) => {
  const types = typesRegistry.toJS();
  const { serialize, deserialize } = serializeProvider(types);
  interpretAst(ast, deserialize(context))
    .then(value => socket.emit(`resp:${id}`, { type: 'msgSuccess', value: serialize(value) }))
    // TODO: I don't think this is possible to hit. I'm leaving it as a comment for now
    .catch(e => socket.emit(`resp:${id}`, { type: 'msgError', value: createError(e) }));
});
