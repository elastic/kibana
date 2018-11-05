/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getServerRegistries } from '../server_registries';
import { interpretProvider } from '../../../common/interpreter/interpret';
import { createHandlers } from '../create_handlers';

export const server = async ({ onFunctionNotFound, server, request }) => {
  const { serverFunctions, types } = await getServerRegistries(['serverFunctions', 'types']);

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
};
