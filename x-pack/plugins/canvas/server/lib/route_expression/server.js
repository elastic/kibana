/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getServerRegistries } from '../server_registries';
import { interpretProvider } from '../../../common/interpreter/interpret';
import { createHandlers } from '../create_handlers';
import { getAuthHeader } from '../../routes/get_auth/get_auth_header';

export const server = ({ onFunctionNotFound, server, socket }) => {
  const pluginsReady = getServerRegistries(['serverFunctions', 'types']);

  const request = socket.handshake;
  const authHeader = getAuthHeader(request, server);

  return Promise.all([pluginsReady, authHeader]).then(
    ([{ serverFunctions, types }, authHeader]) => {
      if (server.plugins.security) request.headers.authorization = authHeader;

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
