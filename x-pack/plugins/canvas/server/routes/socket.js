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

console.log('LOADING SOCKET, IMPORTING EXPRESSION ROUTER');

export function socketApi(server) {
  const io = socket(server.listener, { path: '/socket.io' });

  io.on('connection', socket => {
    // This is the HAPI request object

    const types = typesRegistry.toJS();
    const { serialize, deserialize } = serializeProvider(types);

    // We'd be better off creating the environments here, then passing them to the expression router
    const routeExpression = routeExpressionProvider([
      thread({ onFunctionNotFound, serialize, deserialize }),
      serverEnv({ server, socket, onFunctionNotFound, serialize, deserialize }),
      browser({ socket, onFunctionNotFound, serialize, deserialize }),
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
      return routeExpression(ast, deserialize(context))
        .then(value => {
          socket.emit(`resp:${id}`, { value: serialize(value) });
        })
        .catch(e => {
          socket.emit(`resp:${id}`, {
            error: e.message,
            stack: e.stack,
          });
        });
    };

    socket.on('run', handler);
    socket.on('disconnect', () => {
      socket.removeListener('run', handler);
    });
  });
}
