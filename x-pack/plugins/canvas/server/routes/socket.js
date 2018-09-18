/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import socket from 'socket.io';
import { serializeProvider } from '../../common/lib/serialize';
import { functionsRegistry } from '../../common/lib/functions_registry';
import { typesRegistry } from '../../common/lib/types_registry';
import { populateServerRegistries } from '../lib/populate_server_registries';
import { routeExpressionProvider } from '../lib/route_expression';
import { browser } from '../lib/route_expression/browser';
import { thread } from '../lib/route_expression/thread';
import { server as serverEnv } from '../lib/route_expression/server';
import { getAuthHeader } from './get_auth/get_auth_header';

export function socketApi(server) {
  const io = socket(server.listener, { path: '/socket.io' });

  io.on('connection', socket => {
    console.log('User connected, attaching handlers');

    // This is the HAPI request object
    const request = socket.handshake;
    const authHeader = getAuthHeader(request, server);
    const types = typesRegistry.toJS();
    const { serialize, deserialize } = serializeProvider(types);

    // We'd be better off creating the environments here, then passing them to the expression router
    const routeExpression = routeExpressionProvider([
      browser({ socket, onFunctionNotFound, serialize, deserialize }),
      thread({ onFunctionNotFound, serialize, deserialize }),
      serverEnv({ server, socket, onFunctionNotFound, serialize, deserialize }),
    ]);

    function onFunctionNotFound(ast, context) {
      return routeExpression(ast, context);
    }

    socket.on('getFunctionList', () => {
      populateServerRegistries(['serverFunctions', 'types']).then(() =>
        socket.emit('functionList', functionsRegistry.toJS())
      );
    });

    const handler = ({ ast, context, id }) => {
      Promise.all([authHeader]).then(([authHeader]) => {
        if (server.plugins.security) request.headers.authorization = authHeader;
        return routeExpression(ast, context)
          .then(value => {
            socket.emit(`resp:${id}`, { value: serialize(value) });
          })
          .catch(e => {
            socket.emit(`resp:${id}`, {
              error: e.message,
              stack: e.stack,
            });
          });
      });
    };

    socket.on('run', handler);
    socket.on('disconnect', () => {
      console.log('User disconnected, removing handlers.');
      socket.removeListener('run', handler);
    });
  });
}
