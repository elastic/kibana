/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getServerRegistries } from '../server_registries';
import { interpretProvider } from '../../../common/interpreter/interpret';
import { createHandlers } from '../create_handlers';
import { getRequest } from '../../lib/get_request';

export const server = ({ onFunctionNotFound, server, socket }) => {
  const pluginsReady = getServerRegistries(['serverFunctions', 'types']);

  return Promise.all([pluginsReady, getRequest(server, socket.handshake)]).then(
    ([{ serverFunctions, types }, request]) => {
      // 'request' is the modified hapi request object
      return {
        interpret: (ast, context) => {
          const interpret = interpretProvider({
            types: types.toJS(),
            functions: serverFunctions.toJS(),
            handlers: createHandlers(request, server),
            onFunctionNotFound,
          });

          return interpret(ast, context);
        },
        getFunctions: () => Object.keys(serverFunctions.toJS()),
      };
    }
  );
};
