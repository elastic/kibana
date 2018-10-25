/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { socketInterpreterProvider } from '../../common/interpreter/socket_interpret';
import { serializeProvider } from '../../common/lib/serialize';
import { getSocket } from '../socket';
import { typesRegistry } from '../../common/lib/types_registry';
import { createHandlers } from './create_handlers';
import { functionsRegistry } from './functions_registry';
import { loadBrowserPlugins } from './load_browser_plugins';

let socket;
let functionList;

export async function initialize() {
  socket = getSocket();

  // Listen for interpreter runs
  socket.on('run', ({ ast, context, id }) => {
    const types = typesRegistry.toJS();
    const { serialize, deserialize } = serializeProvider(types);
    interpretAst(ast, deserialize(context)).then(value => {
      socket.emit(`resp:${id}`, { value: serialize(value) });
    });
  });

  // Create the function list
  socket.emit('getFunctionList');
  functionList = new Promise(resolve => socket.once('functionList', resolve));
  return functionList;
}

// Use the above promise to seed the interpreter with the functions it can defer to
export async function interpretAst(ast, context) {
  // Load plugins before attempting to get functions, otherwise this gets racey
  return Promise.all([functionList, loadBrowserPlugins()])
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
