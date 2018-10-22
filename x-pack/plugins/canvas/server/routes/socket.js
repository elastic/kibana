/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import socket from 'socket.io';
import { serializeProvider } from '../../common/lib/serialize';
import { typesRegistry } from '../../common/lib/types_registry';
import { getServerRegistries } from '../lib/server_registries';
import { routeExpressionProvider } from '../lib/route_expression';
import { browser } from '../lib/route_expression/browser';
import { thread } from '../lib/route_expression/thread';
import { server as serverEnv } from '../lib/route_expression/server';
import { createError } from '../../common/interpreter/create_error';

export function socketApi(server) {
  const io = socket(server.listener, { path: '/socket.io' });

  io.on('connection', socket => {
    // This is the HAPI request object

    const types = typesRegistry.toJS();
    const { serialize, deserialize } = serializeProvider(types);

    // I'd love to find a way to generalize all of these, but they each need a different set of things
    // Note that ORDER MATTERS here. The environments will be tried in this order. Do not reorder this array.
    const routeExpression = routeExpressionProvider([
      thread({ onFunctionNotFound, serialize, deserialize }),
      serverEnv({ onFunctionNotFound, socket, server }),
      browser({ onFunctionNotFound, socket, serialize, deserialize }),
    ]);

    function onFunctionNotFound(ast, context) {
      return routeExpression(ast, context);
    }

    socket.on('getFunctionList', () => {
      getServerRegistries().then(({ serverFunctions }) =>
        socket.emit('functionList', serverFunctions.toJS())
      );
    });

    const handler = ({ ast, context, id }) => {
      return (
        routeExpression(ast, deserialize(context))
          .then(value => socket.emit(`resp:${id}`, { type: 'msgSuccess', value: serialize(value) }))
          // TODO: I don't think it is possible to hit this right now? Maybe ever?
          .catch(e => socket.emit(`resp:${id}`, { type: 'msgError', error: createError(e) }))
      );
    };

    socket.on('run', handler);
    socket.on('disconnect', () => {
      socket.removeListener('run', handler);
    });
  });
}
