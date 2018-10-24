/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import socket from 'socket.io';
import { createHandlers } from '../lib/create_handlers';
import { socketInterpreterProvider } from '../../common/interpreter/socket_interpret';
import { serializeProvider } from '../../common/lib/serialize';
import { functionsRegistry } from '../../common/lib/functions_registry';
import { typesRegistry } from '../../common/lib/types_registry';
import { loadServerPlugins } from '../lib/load_server_plugins';
import { getRequest } from '../lib/get_request';

export function socketApi(server) {
  const io = socket(server.listener, { path: '/socket.io' });

  io.on('connection', socket => {
    // Create the function list
    socket.emit('getFunctionList');
    const getClientFunctions = new Promise(resolve => socket.once('functionList', resolve));

    socket.on('getFunctionList', () => {
      loadServerPlugins().then(() => socket.emit('functionList', functionsRegistry.toJS()));
    });

    const handler = ({ ast, context, id }) => {
      Promise.all([getClientFunctions, getRequest(server, socket.handshake)]).then(
        ([clientFunctions, request]) => {
          // request is the modified hapi request object
          const types = typesRegistry.toJS();
          const interpret = socketInterpreterProvider({
            types,
            functions: functionsRegistry.toJS(),
            handlers: createHandlers(request, server),
            referableFunctions: clientFunctions,
            socket: socket,
          });

          const { serialize, deserialize } = serializeProvider(types);
          return interpret(ast, deserialize(context))
            .then(value => {
              socket.emit(`resp:${id}`, { value: serialize(value) });
            })
            .catch(e => {
              socket.emit(`resp:${id}`, {
                error: e.message,
                stack: e.stack,
              });
            });
        }
      );
    };

    socket.on('run', handler);
    socket.on('disconnect', () => {
      socket.removeListener('run', handler);
    });
  });
}
